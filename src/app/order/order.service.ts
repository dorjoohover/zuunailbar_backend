import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AvailableTimeDto, OrderDto } from './order.dto';
import { OrdersDao } from './order.dao';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  ADMIN,
  CLIENT,
  EMPLOYEE,
  ENDTIME,
  getDefinedKeys,
  MANAGER,
  mnDate,
  OrderStatus,
  PAYMENT_STATUS,
  PaymentMethod,
  SALARY_LOG_STATUS,
  STARTTIME,
  STATUS,
  timeToDecimal,
  toTimeString,
  toYMD,
  UserLevel,
  usernameFormatter,
  UserStatus,
} from 'src/base/constants';
import { AppUtils } from 'src/core/utils/app.utils';
import { OrderDetailService } from '../order_detail/order_detail.service';
import { ServiceService } from '../service/service.service';
import { Order, Slot } from './order.entity';
import { QpayService } from './qpay.service';
import { ExcelService } from 'src/excel.service';
import { Response } from 'express';
import { UserService } from '../user/user.service';
import { MobileParser } from 'src/common/formatter';
import { isSameDay } from 'date-fns';
import { User } from '../user/user.entity';
import { BadRequest, OrderError } from 'src/common/error';
import { OrderDetailDto } from '../order_detail/order_detail.dto';
import { UserServiceService } from '../user_service/user_service.service';
import { IntegrationService } from '../integrations/integrations.service';
import { PaymentService } from '../payment/payment.service';
import { OrderLogDao } from './order.log.dao';
import { AppDB } from 'src/core/db/pg/app.db';
import { AuthService } from 'src/auth/auth.service';

const normalizePriceValue = (value?: number | string | null) => {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) return 0;

  return Math.max(amount, 0);
};

const normalizeOrderDetailPrices = <T extends { price?: number | null }>(
  details: T[],
  orderTotal?: number | null,
  orderDiscount?: number | null,
) => {
  if (!Array.isArray(details) || details.length === 0) return [];

  const normalizedDetails = details.map((detail) => ({
    ...detail,
    price: normalizePriceValue(detail?.price),
  }));
  const subtotal = normalizedDetails.reduce(
    (sum, detail) => sum + Number(detail.price ?? 0),
    0,
  );

  if (subtotal <= 0) return normalizedDetails;

  const expectedTotal = normalizePriceValue(orderTotal);
  const expectedDiscount = normalizePriceValue(orderDiscount);
  const hasExpectedTotal =
    orderTotal != null && Number.isFinite(Number(orderTotal));
  const discountToApply = Math.min(
    subtotal,
    Math.max(
      0,
      hasExpectedTotal && expectedTotal < subtotal
        ? subtotal - expectedTotal
        : expectedDiscount,
    ),
  );

  if (discountToApply <= 0) return normalizedDetails;

  const discountable = normalizedDetails
    .map((detail, index) => ({
      index,
      price: Number(detail.price ?? 0),
    }))
    .filter((detail) => detail.price > 0);

  if (!discountable.length) return normalizedDetails;

  let distributed = 0;
  const shares = new Map<number, number>();

  discountable.forEach((detail, index) => {
    const share =
      index === discountable.length - 1
        ? discountToApply - distributed
        : Math.min(
            detail.price,
            Math.round((detail.price / subtotal) * discountToApply),
          );

    distributed += share;
    shares.set(detail.index, share);
  });

  return normalizedDetails.map((detail, index) => ({
    ...detail,
    price: Math.max(Number(detail.price ?? 0) - (shares.get(index) ?? 0), 0),
  }));
};

@Injectable()
export class OrderService {
  private orderError = new OrderError();
  public orderLimit = 7;
  private bronze = 10;
  private silver = 20;
  private gold = 30;
  private customerLevelNames: Record<number, string> = {
    [UserLevel.BRONZE]: 'Bronze',
    [UserLevel.SILVER]: 'Silver',
    [UserLevel.GOLD]: 'Gold',
  };
  private employeeLevelNames: Record<number, string> = {
    [UserLevel.JUNIOR]: 'Junior',
    [UserLevel.SENIOR]: 'Senior',
  };
  private pendingCleanupPromise?: Promise<void>;
  private lastPendingCleanupAt = 0;
  private readonly prePaymentInvoiceTtlMs = 10 * 60 * 1000;
  constructor(
    private readonly dao: OrdersDao,
    private readonly orderDetail: OrderDetailService,
    private readonly service: ServiceService,
    private readonly user: UserService,
    private excel: ExcelService,
    private qpay: QpayService,
    private userService: UserServiceService,
    private integrationService: IntegrationService,
    private orderLog: OrderLogDao,
    private authService: AuthService,
    // @Inject(forwardRef(() => PaymentService))
    private payment: PaymentService,
    private readonly db: AppDB,
  ) {}
  public async canPlaceOrder(
    dto: Order,
    user: User,
    details: OrderDetailDto[],
    merchant: string,
  ) {
    if (user.role == EMPLOYEE) this.orderError.orderNotAllowed;
    if (dto.order_status == OrderStatus.Friend) return;
    if (user.status == UserStatus.Banned) this.orderError.bannedUser;
    let artists;
    try {
      artists = await Promise.all(
        details.map(async (d) => (await this.user.findOne(d.user_id)).role),
      );
    } catch (error) {
      artists = null;
    }
    if (
      artists == null ||
      artists?.filter((artist) => artist <= EMPLOYEE && artist >= MANAGER)
        .length == 0
    )
      this.orderError.userNotFound;
    let client;
    try {
      client = await this.user.findOne(dto.customer_id);
    } catch (error) {
      client = null;
    }
    // if (client == null || client.role != CLIENT) this.orderError.clientNotFound;
    if (!dto.start_time || !dto.order_date)
      this.orderError.dateOrTimeNotSelected;

    if (details.length <= 0) this.orderError.serviceNotSelected;
    const start_time = timeToDecimal(dto.start_time.toString());
    if (start_time < STARTTIME || start_time > ENDTIME)
      this.orderError.invalidHour;
    const date = new Date();
    const nowHour = date.getHours() + date.getMinutes() / 60;
    if (
      user.role == CLIENT &&
      start_time < nowHour &&
      isSameDay(date, dto.order_date)
    )
      this.orderError.cannotChooseHour;
  }
  public async getOrderLimit() {
    return await this.dao.getLimit();
  }

  public async getSlots(pg: PaginationDto) {
    await this.reconcilePendingOrdersForSlots();

    const { parallel, branch_id, services, date, time, multi_artist_queue } = pg;
    let artists = [];
    let result: Slot[] = [];

    const p = parallel === 'true';
    const allowQueueMultiArtist =
      !p && (multi_artist_queue === true || multi_artist_queue === 'true');
    const service = services ? services.split(',') : [];
    if (services) {
      if (service.length > 0) {
        const artists_res = await this.userService.getByServices({
          services: service,
          parallel: p || allowQueueMultiArtist,
          branch_id,
        });
        artists = artists_res.map((r) => r.user_id);
      }
    }
    const selected_services = await this.service.getBookingConfigs(
      service,
      branch_id,
    );

    const categories = [
      ...new Set(
        selected_services
          .map((d) => d?.category_id)
          .filter((category): category is string => Boolean(category)),
      ),
    ];
    const durations = selected_services.map((d) => Number(d.duration) || 0);
    const needDuration = p || allowQueueMultiArtist
      ? Math.max(0, ...durations)
      : durations.reduce((a, b) => a + b, 0);

    result = await this.dao.getSlotsUnified({
      branch_id,
      artists,
      categories,
      date: date ? `${date}`.slice(0, 10) : undefined,
      time: time ? `${time}` : undefined,
      parallel: p,
      requireAllCategoriesForQueue: !allowQueueMultiArtist,
    });
    const validSlots = [];
    const dates = [...new Set(result.map((r) => r.date))];
    const valid_artists = [...new Set(result.map((r) => r.artist_id))];

    const details = await this.dao.get_order_details({
      date: dates,
      artists: valid_artists,
    });

    // 🔥 group by artist_id
    const ordersByArtist: Record<string, any[]> = {};

    for (const d of details) {
      if (!ordersByArtist[d.user_id]) {
        ordersByArtist[d.user_id] = [];
      }
      ordersByArtist[d.user_id].push(d);
    }

    for (const slot of result) {
      const start = this.combineDateTime(slot.date, slot.start_time.toString());
      const end = new Date(start.getTime() + needDuration * 60000);
      const finishBoundary = this.resolveEffectiveFinishTime(slot.finish_time);
      const artistOrders = ordersByArtist[slot.artist_id] || [];

      const hasConflict = artistOrders.some((order) => {
        const res = this.isOverlapping(
          start,
          end,
          order.start_ts,
          order.end_ts,
        );
        return res;
      });

      const exceedsFinishBoundary =
        finishBoundary != null &&
        end > this.combineDateTime(slot.date, finishBoundary);

      if (!hasConflict && !exceedsFinishBoundary) {
        validSlots.push(slot);
      }
    }
    return validSlots;
  }
  private async reconcilePendingOrdersForSlots() {
    const now = Date.now();

    if (this.pendingCleanupPromise) {
      await this.pendingCleanupPromise;
      return;
    }

    if (now - this.lastPendingCleanupAt < 30 * 1000) {
      return;
    }

    this.pendingCleanupPromise = this.checkOrders()
      .catch((error) => {
        console.error(
          'Pending order reconciliation before slot lookup failed:',
          error,
        );
      })
      .finally(() => {
        this.lastPendingCleanupAt = Date.now();
        this.pendingCleanupPromise = undefined;
      });

    await this.pendingCleanupPromise;
  }
  private isOverlapping(startA: Date, endA: Date, startB: Date, endB: Date) {
    return startA < endB && endA > startB;
  }
  private normalizeTimeValue(time: Date | string) {
    if (time instanceof Date) {
      return time.toTimeString().slice(0, 8);
    }

    const raw = `${time}`;
    const fullMatch = raw.match(/(\d{2}:\d{2}:\d{2})/);
    if (fullMatch) return fullMatch[1];

    const shortMatch = raw.match(/(\d{2}:\d{2})/);
    if (shortMatch) return `${shortMatch[1]}:00`;

    return raw;
  }
  private hasEnoughContinuousSlots(
    startTime: number,
    needDuration: number,
    availableTimes?: Set<number>,
  ) {
    if (!availableTimes || availableTimes.size === 0) return false;

    const slotCount = Math.max(1, Math.ceil(needDuration / 30));

    for (let i = 0; i < slotCount; i++) {
      const requiredTime = startTime + i * 0.5;
      if (!availableTimes.has(requiredTime)) {
        return false;
      }
    }

    return true;
  }
  private normalizeDurationMinutes(value?: number | string | null) {
    const minutes = Number(value ?? 0);
    if (!Number.isFinite(minutes) || minutes <= 0) return 0;

    return Math.ceil(minutes / 30) * 30;
  }
  private addDurationToTimeString(
    startTime: Date | string,
    durationMinutes: number,
  ) {
    const normalizedStartTime = this.normalizeTimeValue(startTime);
    const normalizedDuration = this.normalizeDurationMinutes(durationMinutes);
    const end = timeToDecimal(normalizedStartTime) + normalizedDuration / 60;

    return toTimeString(Math.floor(end), end % 1 !== 0);
  }
  private combineDateTime(date: Date, time: string) {
    const d = new Date(date);

    const [h, m, s] = this.normalizeTimeValue(time).split(':').map(Number);

    d.setHours(h, m, s || 0, 0);

    return d;
  }
  private resolveEffectiveFinishTime(
    ...candidates: Array<Date | string | null | undefined>
  ) {
    const normalized = candidates
      .filter(Boolean)
      .map((time) => this.normalizeTimeValue(time as Date | string));

    if (!normalized.length) return null;

    return normalized.reduce((earliest, current) =>
      timeToDecimal(current) < timeToDecimal(earliest) ? current : earliest,
    );
  }
  private async validateShiftFinishBoundaries(input: {
    branch_id?: string;
    order_date: Date | string;
    details: Array<{
      user_id: string;
      start_time: string;
      end_time: string;
    }>;
  }) {
    const { branch_id, order_date, details } = input;
    if (!branch_id || !details.length) return;

    const artists = [
      ...new Set(details.map((detail) => detail.user_id).filter(Boolean)),
    ];
    if (!artists.length) return;

    const boundaries = await this.dao.getShiftBoundaries({
      branch_id,
      artists,
      date:
        typeof order_date === 'string'
          ? order_date
          : toYMD(new Date(order_date)),
    });

    const finishTimeByArtist = new Map<string, string>();

    for (const row of boundaries) {
      const finishTime = this.resolveEffectiveFinishTime(
        row?.schedule_finish_time,
        row?.booking_finish_time,
      );

      if (finishTime) {
        finishTimeByArtist.set(row.artist_id, finishTime);
      }
    }

    for (const detail of details) {
      const finishTime = finishTimeByArtist.get(detail.user_id);
      if (!finishTime) continue;

      if (
        timeToDecimal(this.normalizeTimeValue(detail.end_time)) >
        timeToDecimal(finishTime)
      ) {
        throw new HttpException(
          'Ажилтны тарах цагаас хэтэрсэн захиалга байна.',
          400,
        );
      }
    }
  }
  private async syncOrderPaidMeta(
    orderId: string,
    paidAt?: Date,
    method?: PaymentMethod,
  ) {
    if (!paidAt || method == null) return;

    await this.updatePaidDate(orderId, paidAt, PaymentMethod[method]);
  }
  private async clearOrderPaidMeta(orderId: string) {
    await this.dao.clearPaidMeta(orderId);
  }
  private isActivePrePayment(payment: any) {
    return (
      payment?.is_pre_amount === true &&
      payment?.status === PAYMENT_STATUS.Active
    );
  }
  private async syncPaidPrePayment(orderId: string): Promise<boolean | null> {
    const order = await this.findOne(orderId);
    if (order?.is_pre_amount_paid) return true;

    const payments = await this.payment.listByOrder(orderId);
    const activePrePayment = payments.find((payment) =>
      this.isActivePrePayment(payment),
    );

    if (activePrePayment) {
      await this.updatePrePaid(orderId, true);
      return true;
    }

    const invoice = [...payments]
      .reverse()
      .find((payment) => Boolean(payment?.invoice_id));

    if (!invoice?.invoice_id) return false;

    let result;
    try {
      result = await this.qpay.checkPayment(invoice.invoice_id);
    } catch (error) {
      console.error('QPay pending order check failed:', error);
      return null;
    }

    if (!result?.paid_amount) return false;

    const row = result?.rows?.[0];
    await this.payment.markInvoicePaid({
      invoice_id: invoice.invoice_id,
      paid_at: new Date(),
      payment_id: row?.payment_id,
    });
    await this.updatePrePaid(orderId, true);

    return true;
  }
  private toPrePaymentInvoiceResponse(payment: any, order: any) {
    return {
      invoice_id: payment.invoice_id,
      qr_image: payment.qr_image,
      qr_text: payment.qr_text,
      urls: payment.urls ?? [],
      price: Number(payment.amount ?? order.pre_amount ?? 0),
      status: order.order_status ?? OrderStatus.Pending,
      created: payment.created_at ?? new Date(),
    };
  }
  private isPrePaymentInvoiceExpired(payment: any) {
    const created = new Date(payment?.created_at ?? Date.now()).getTime();
    if (!Number.isFinite(created)) return false;
    return Date.now() - created >= this.prePaymentInvoiceTtlMs;
  }
  private async markOrderPrePaymentActive(orderId: string, user?: string) {
    await this.updateStatus({
      id: orderId,
      order_status: OrderStatus.Active,
      user,
    });
    await this.orderDetail.updateStatusByOrder(orderId, OrderStatus.Active);
  }
  private async cancelPendingOrder(row: any) {
    await this.updateStatus({
      id: row.id,
      order_status: OrderStatus.Cancelled,
    });
    await this.orderDetail.updateStatusByOrder(row.id, OrderStatus.Cancelled);

    const mobile = MobileParser(row.mobile);
    const date = mnDate(row.order_date);
    const time = row.start_time ? row.start_time?.slice(0, 5) : '';
    await this.authService.sendCancelWarning(mobile, {
      order_date: date,
      time,
    });
  }
  public async updateOrderLimit(limit: number) {
    await this.dao.orderLimit(limit);
    // this.slot.updateOrderLimit(limit);
  }
  public async getUserCount(user: string) {
    const res = await this.dao.customerCheck(user);
    return {
      count: res,
    };
  }
  public async getCustomerOrderCount(customerId: string) {
    const count = await this.dao.customerCheck(customerId);
    return {
      count,
    };
  }

  public async create(dto: OrderDto, user: User, merchant: string) {
    try {
      const admin = user.role <= ADMIN;
      const requiresOnlinePrePayment = !admin;
      const canManagePreAmount = user.role < MANAGER;
      const preMethod = dto.pre_method ?? dto.method;
      const normalizedDetails = normalizeOrderDetailPrices(
        dto.details ?? [],
        dto.total_amount ?? null,
        dto.discount ?? 0,
      );
      const normalizedTotalAmount = normalizedDetails.reduce(
        (sum, detail) => sum + Number(detail.price ?? 0),
        0,
      );
      if (!dto.branch_id) {
        throw new HttpException('Салбар сонгоно уу.', HttpStatus.BAD_REQUEST);
      }
      if (normalizedDetails.length <= 0) this.orderError.serviceNotSelected;
      const parallel = dto.parallel;
      const serviceConfigs = await this.service.getBookingConfigs(
        normalizedDetails.map((detail) => detail.service_id),
        dto.branch_id,
      );
      const serviceMap = new Map(
        serviceConfigs.map((service) => [service.id, service]),
      );

      // artists.length == 0 || artists?.[0] == '0' && artists =

      const orderDate = toYMD(new Date(dto.order_date));
      let pre = 0;
      const detailConfigs: Array<{
        detail: OrderDetailDto;
        service: any;
        duration: number;
      }> = [];
      for (const detail of normalizedDetails) {
        if (!detail.user_id) {
          throw new HttpException(
            'Артист сонгоно уу.',
            HttpStatus.BAD_REQUEST,
          );
        }
        const service = serviceMap.get(detail.service_id);
        if (!service) throw new BadRequest().notFound('Үйлчилгээ');
        const isAssignedToBranch = await this.userService.hasActiveAssignment({
          user_id: detail.user_id,
          service_id: detail.service_id,
          branch_id: dto.branch_id,
        });
        if (!isAssignedToBranch) {
          throw new HttpException(
            'Сонгосон артист тухайн салбарт энэ үйлчилгээг үзүүлэх боломжгүй байна.',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (+(service.pre ?? '0') > pre) pre = +service.pre;
        detailConfigs.push({
          detail,
          service,
          duration: this.normalizeDurationMinutes(
            detail.duration ?? service.duration ?? '0',
          ),
        });
      }
      const duration = parallel
        ? Math.max(0, ...detailConfigs.map((detail) => detail.duration))
        : detailConfigs.reduce((sum, detail) => sum + detail.duration, 0);
      if (admin && dto.pre_amount) {
        pre = +dto.pre_amount;
      }
      const orderPreAmount = canManagePreAmount
        ? +(dto.pre_amount ?? pre ?? 0)
        : +(pre ?? 0);
      const orderTotalAmount = Math.max(normalizedTotalAmount, orderPreAmount, 0);
      const start_time = this.normalizeTimeValue(dto.start_time.toString());
      const startHour = timeToDecimal(start_time);
      const end_time = this.addDurationToTimeString(start_time, duration);
      // 4) DB-д TIME талбар руу "HH:00:00" гэх мэтээр бичнэ
      const order_status =
        user.role == ADMIN
          ? OrderStatus.Active
          : (dto.order_status ?? OrderStatus.Pending);
      const payload: Order = {
        id: AppUtils.uuid4(),
        customer_id: dto.customer_id ?? user.id,
        order_date: orderDate, // Date (өдөр давсан бол +1, +2 ...)
        start_time: start_time,
        end_time: end_time,
        duration: duration,
        description: dto.description ?? null,
        discount_type: dto.discount_type ?? null,
        discount: dto.discount ?? 0,
        voucher_id: dto.voucher_id ?? null,
        voucher_name: dto.voucher_name ?? null,
        voucher_value: dto.voucher_value ?? 0,
        total_amount: orderTotalAmount,
        paid_amount: dto.paid_amount ?? 0,
        pre_amount: orderPreAmount,
        is_pre_amount_paid: orderPreAmount == 0,
        order_status,
        status: STATUS.Active,
        parallel,
        created_by: user.id,
        branch_id: dto.branch_id,
      } as const;
      if (requiresOnlinePrePayment && orderPreAmount <= 0) {
        throw new HttpException(
          'Урьдчилгаа төлбөр үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (requiresOnlinePrePayment && preMethod !== PaymentMethod.QPAY) {
        throw new HttpException(
          'Урьдчилгаа төлбөр үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!admin) {
        await this.canPlaceOrder(
          {
            ...payload,
            start_time: dto.start_time.toString(),
          },
          user,
          normalizedDetails,
          merchant,
        );
      }
      let startDate = startHour;
      const orderDetails = [];
      for (const { detail, service, duration } of detailConfigs) {
        const artist = await this.user.findOne(detail.user_id);
        const durationHours = duration / 60;
        const endDate = startDate + durationHours;
        orderDetails.push({
          id: AppUtils.uuid4(),
          start_time: toTimeString(Math.floor(startDate), startDate % 1 != 0),
          end_time: toTimeString(Math.floor(endDate), endDate % 1 != 0),
          service_id: service.id,
          order_date: orderDate,
          service_name: service.name,
          price: detail.price,
          duration: duration,
          nickname: artist.nickname,
          description: detail.description,
          status: order_status,
          view_status: STATUS.Active,
          user_id: artist.id ?? detail.user_id,
        });

        if (dto.parallel !== true) startDate = endDate;
      }

      await this.validateShiftFinishBoundaries({
        branch_id: dto.branch_id,
        order_date: orderDate,
        details: orderDetails.map((detail) => ({
          user_id: detail.user_id,
          start_time: detail.start_time,
          end_time: detail.end_time,
        })),
      });

      let invoice: {
        invoice_id: string;
        qr_image?: string;
        qr_text?: string;
      } | null = null;
      if (preMethod == PaymentMethod.QPAY && orderPreAmount > 0) {
        try {
          invoice = await this.qpay.createInvoice(
            orderPreAmount,
            payload.id,
            user.id,
            dto.branch_id,
            user.mobile,
          );
        } catch (error) {
          throw new HttpException(
            'Урьдчилгаа төлбөр үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const order = await this.dao.create(payload, orderDetails);
      if (invoice) {
        await this.payment.create(
          {
            amount: orderPreAmount,
            is_pre_amount: true,
            created_by: user.id,
            invoice_id: invoice.invoice_id,
            qr_image: invoice.qr_image,
            qr_text: invoice.qr_text,
            status: PAYMENT_STATUS.Pending,
            method: PaymentMethod.QPAY,
            order_id: order,
          },
          merchant,
        );
        return {
          id: order,
          invoice: {
            ...invoice,
            price: orderPreAmount,
            status: OrderStatus.Pending,
            created: new Date(),
          },
        };
      } else {
        const paymentSync = await this.payment.syncManualPayments({
          merchant,
          order_id: order,
          created_by: user.id,
          method: dto.method,
          pre_method: preMethod,
          paid_amount: Number(dto.paid_amount ?? 0),
          pre_amount: orderPreAmount,
        });
        if (paymentSync.latestPaidAt && paymentSync.latestMethod != null) {
          await this.syncOrderPaidMeta(
            order,
            paymentSync.latestPaidAt,
            paymentSync.latestMethod,
          );
        }
        await this.updatePrePaid(order, true);
        await this.dao.updateOrderStatus(order, OrderStatus.Active);
        return { id: order };
      }
    } catch (error) {
      console.error('Order create failed:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      return await this.dao.getById(id);
    } catch (error) {
      return null;
    }
  }

  private async ensureOrderAccess(
    orderId: string,
    userId: string,
    role: number,
  ) {
    const order = await this.findOne(orderId);
    if (!order) {
      throw new UnauthorizedException();
    }
    if (role === CLIENT && order.customer_id !== userId) {
      throw new UnauthorizedException();
    }
    return order;
  }

  public async checkPayment(
    invoiceId: string,
    id: string,
    user: string,
    role: number,
  ) {
    await this.ensureOrderAccess(id, user, role);
    const payments = await this.payment.listByOrder(id);
    if (!payments.some((payment) => payment?.invoice_id === invoiceId)) {
      throw new UnauthorizedException();
    }
    const res = await this.qpay.checkPayment(invoiceId);
    if (res?.paid_amount) {
      const row = res?.rows?.[0];
      await this.payment.markInvoicePaid({
        invoice_id: invoiceId,
        paid_at: new Date(),
        payment_id: row?.payment_id,
      });
      await this.updateStatus({
        id,
        order_status: OrderStatus.Active,
        user,
      });
      await this.orderDetail.updateStatusByOrder(id, OrderStatus.Active);
      await this.updatePrePaid(id, true);
      return {
        status: OrderStatus.Active,
        paid: true,
      };
    }
    return {
      paid: false,
    };
  }
  public async getPaymentInvoice(id: string, user: string, role: number) {
    const order = await this.ensureOrderAccess(id, user, role);

    if (order.is_pre_amount_paid || order.order_status === OrderStatus.Active) {
      return {
        status: OrderStatus.Active,
        paid: true,
      };
    }

    if (order.order_status !== OrderStatus.Pending) {
      return {
        status: order.order_status,
        payable: false,
      };
    }

    const paid = await this.syncPaidPrePayment(id);
    const paymentCheckUnavailable = paid === null;
    if (paid === true) {
      await this.markOrderPrePaymentActive(id, user);
      return {
        status: OrderStatus.Active,
        paid: true,
      };
    }

    const payments = await this.payment.listByOrder(id);
    const invoice = [...payments]
      .reverse()
      .find(
        (payment) =>
          payment?.invoice_id &&
          payment?.is_pre_amount === true &&
          payment?.status !== PAYMENT_STATUS.Cancelled,
      );

    if (!invoice) {
      return {
        status: order.order_status,
        payable: false,
      };
    }

    if (this.isPrePaymentInvoiceExpired(invoice)) {
      if (paymentCheckUnavailable) {
        return {
          status: order.order_status,
          payment_check_unavailable: true,
        };
      }
      await this.dao.updateOrderStatus(id, OrderStatus.Absent);
      await this.orderDetail.updateStatusByOrder(id, OrderStatus.Absent);
      return {
        status: OrderStatus.Absent,
        expired: true,
      };
    }

    return this.toPrePaymentInvoiceResponse(invoice, order);
  }

  public async cancelOrder(id: string, user: string, role: number) {
    try {
      const order = await this.ensureOrderAccess(id, user, role);
      if (order.order_status === OrderStatus.Pending) {
        const paid = await this.syncPaidPrePayment(id);
        if (paid === true) {
          await this.markOrderPrePaymentActive(id, user);
          return true;
        }
        if (paid === null) {
          throw new HttpException(
            'Төлбөрийн төлөв шалгаж чадсангүй. Түр хүлээгээд дахин оролдоно уу.',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      await this.dao.updateOrderStatus(id, OrderStatus.Absent);
      await this.orderDetail.updateStatusByOrder(id, OrderStatus.Absent);
      return true;
    } catch (error) {
      console.error('Order cancel failed:', error);
    }
  }

  public async findByClient(pg: PaginationDto) {
    try {
      const res = await this.dao.listWithDetails(
        applyDefaultStatusFilter({ ...pg }, CLIENT),
      );
      return {
        items: res.items,
        count: res.count,
      };
    } catch (error) {
      console.error('Client order lookup failed:', error);
    }
  }

  public async find(pg: PaginationDto, role: number, id?: string) {
    try {
      const q = { ...pg };

      // 🔹 customer filter
      if (pg.customer && role < EMPLOYEE) {
        const users = await this.user.search(
          { id: pg.customer, skip: undefined, limit: undefined },
          '3f86c0b23a5a4ef89a745269e7849640',
        );

        q.customers = users.map((u) => u.id);
      }

      const query = applyDefaultStatusFilter(
        role === CLIENT ? { ...q, customer_id: id } : q,
        role,
      );

      const res = await this.dao.list(query);

      // 🔥 1. order ids цуглуулах
      const orderIds = res.items.map((i) => i.id);

      // 🔥 2. бүх detail-ийг нэг query-гаар авах
      const detailsRes = await this.orderDetail.findByOrderIds(orderIds);
      const detailsMap = new Map<string, any[]>();
      for (const d of detailsRes) {
        const arr = detailsMap.get(d.order_id) ?? [];
        arr.push(d);
        detailsMap.set(d.order_id, arr);
      }
      // 🔥 3. customer ids цуглуулах
      const customerIds = [...new Set(res.items.map((i) => i.customer_id))];

      const customers = await this.user.findMany(customerIds); // 🔥 өөрөө хийвэл сайн
      const customerMap = new Map(customers.map((u) => [u.id, u]));

      // 🔥 4. created_by ids
      const createdByIds = [
        ...new Set(res.items.map((i) => i.created_by).filter(Boolean)),
      ];
      const creators = await this.user.findMany(createdByIds);
      const creatorMap = new Map(creators.map((u) => [u.id, u]));

      // 🔥 5. merge
      const items = res.items.map((item) => {
        const detailItems = detailsMap.get(item.id) ?? [];
        return {
          ...item,
          order_date: mnDate(new Date(item.order_date)),
          customer: customerMap.get(item.customer_id),
          created_by: creatorMap.get(item.created_by),
          details: detailItems,
        };
      });

      return {
        items,
        count: res.count,
      };
    } catch (error) {
      console.error('Order list lookup failed:', error);
    }
  }

  public async getOrders(user: string, day: number) {
    const res = await this.dao.getOrders(user, day);
    return res;
  }

  public async report(pg: PaginationDto, role: number, res: Response) {
    const q = { ...pg };
    if (pg.customer && role < EMPLOYEE) {
      const users = await this.user.search(
        { id: pg.customer, skip: undefined, limit: undefined },
        '3f86c0b23a5a4ef89a745269e7849640',
      );

      q.customers = users.map((u) => u.id);
    }

    const selectCols = [
      'id',
      'customer_id',
      'order_date',
      'end_time',
      'discount',
      'discount_type',
      'start_time',
      'total_amount',
      'branch_id',
    ];

    const { items } = await this.dao.list(
      applyDefaultStatusFilter(q, role),
      selectCols.join(','),
    );
    const details = await this.orderDetail.findByOrderIds(
      items.map((item) => item.id),
    );
    const detailsMap = new Map<string, any[]>();

    for (const detail of details) {
      const current = detailsMap.get(detail.order_id) ?? [];
      current.push(detail);
      detailsMap.set(detail.order_id, current);
    }

    const filteredItems = pg.user_id
      ? items.filter((item) =>
          (detailsMap.get(item.id) ?? []).some(
            (detail) => detail.user_id === pg.user_id,
          ),
        )
      : items;

    const userIds = Array.from(
      new Set(
        filteredItems.flatMap((item) =>
          (detailsMap.get(item.id) ?? [])
            .filter((detail) => !pg.user_id || detail.user_id === pg.user_id)
            .map((detail) => detail.user_id),
        ),
      ),
    ).filter(Boolean) as string[];
    const customerIds = Array.from(
      new Set(filteredItems.map((x) => x.customer_id)?.filter(Boolean)),
    );

    const [usersArr, customersArr] = await Promise.all([
      Promise.all(userIds.map((id) => this.user.findOne(id))),
      Promise.all(customerIds.map((id) => this.user.findOne(id))),
    ]);

    const usersMap = new Map(
      usersArr?.filter(Boolean).map((u: any) => [u.id, u]),
    );
    const customersMap = new Map(
      customersArr?.filter(Boolean).map((c: any) => [c.id, c]),
    );

    // 3) мөрүүдээ бэлдэх
    type Row = {
      artist: string;
      customer: string;
      customerName: string;
      order: Date | string;
      time: string;
      timeEnd: string;
      services: string;
      discountType: number;
      discount: number;
      amount: number;
    };

    const rows: Row[] = filteredItems.map((it: any) => {
      const detailItems = (detailsMap.get(it.id) ?? []).filter(
        (detail) => !pg.user_id || detail.user_id === pg.user_id,
      );
      const artists = Array.from(
        new Set(
          detailItems
            .map((detail) => {
              const user = usersMap.get(detail.user_id);
              return user ? usernameFormatter(user) : '';
            })
            .filter(Boolean),
        ),
      ).join(', ');
      const services = Array.from(
        new Set(
          detailItems.map((detail) => detail.service_name).filter(Boolean),
        ),
      ).join(', ');
      const c = customersMap.get(it.customer_id);

      return {
        artist: artists,
        customer: c?.mobile ? MobileParser(c.mobile) : '',
        customerName: c ? usernameFormatter(c) : '',
        order: it.order_date ? new Date(it.order_date) : '',
        time: it.start_time ?? '',
        timeEnd: it.end_time ?? '',
        services,
        discountType: it.discount_type,
        discount: it.discount,
        amount: Number(it.total_amount ?? 0),
      };
    });

    // 4) Excel баганууд
    const cols = [
      { header: 'Artist', key: 'artist', width: 24 },
      { header: 'Customer', key: 'customer', width: 18 },
      { header: 'Customer name', key: 'customerName', width: 18 },
      { header: 'Order', key: 'order', width: 14 }, // date
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Time end', key: 'timeEnd', width: 10 },
      { header: 'Services', key: 'services', width: 28 },
      { header: 'Discount Type', key: 'discountType', width: 10 },
      { header: 'Discount', key: 'discount', width: 10 },
      { header: 'Amount', key: 'amount', width: 16 }, // money
    ];

    // 5) Excel рүү стримлэж буулгах
    return this.excel.xlsxFromIterable(res, 'order', cols as any, rows as any, {
      sheetName: 'Orders',
      moneyKeys: ['amount', 'discount'],
      dateKeys: ['order'],
    });
  }
  public async get_status_logs(pg) {
    const query = applyDefaultStatusFilter({ ...pg }, ADMIN);
    const res = await this.orderLog.list(query);
    return res;
  }
  private async register_status_logs(input: {
    user: string;
    status?: number;
    order_status?: number;
    order_id: string;
    client?: any;
  }) {
    const { user, order_status, status, order_id, client } = input;
    const order = await this.findOne(order_id);
    if (!order) return;
    const newStatus = status ?? order.status;
    const newOrderStatus = order_status ?? order.order_status;
    if (newStatus == order.status && newOrderStatus == order.order_status)
      return;
    const payload = {
      changed_by: user,
      new_status: newStatus,
      new_order_status: newOrderStatus,
      old_order_status: order.order_status,
      old_status: order.status,
      order_id,
    };
    if (client) {
      await this.orderLog.addTx(client, payload);
      return;
    }
    await this.orderLog.add(payload);
  }

  public async checkOrders() {
    const res = await this.dao.getCancelOrders();
    await Promise.all(
      res.map(async (r) => {
        const paid = await this.syncPaidPrePayment(r.id);
        if (paid === true) {
          await this.markOrderPrePaymentActive(r.id);
          return;
        }

        if (paid === null) return;

        await this.cancelPendingOrder(r);
      }),
    );
  }

  public async update(
    id: string,
    dto: OrderDto,
    user: string,
    role: number,
    merchant?: string,
  ) {
    const normalizedDetails = normalizeOrderDetailPrices(
      dto.details ?? [],
      dto.total_amount ?? null,
      dto.discount ?? 0,
    );
    const {
      details: _details,
      services: _services,
      user_id: _user_id,
      branch_name: _branch_name,
      method: _method,
      pre_method: _pre_method,
      parallel,
      order_date,
      ...body
    } = dto;
    const payload = { order_date, ...body };
    try {
      const preMethod = dto.pre_method ?? dto.method;
      const order = await this.findOne(id);
      if (!order) return;
      if (normalizedDetails.length <= 0) this.orderError.serviceNotSelected;
      const normalizedTotalAmount = normalizedDetails.reduce(
        (sum, detail) => sum + Number(detail.price ?? 0),
        0,
      );
      payload.discount = payload.discount ?? 0;
      payload.voucher_value = payload.voucher_value ?? 0;
      payload.total_amount = normalizedTotalAmount;
      payload.paid_amount = payload.paid_amount ?? order.paid_amount ?? 0;
      const existingDetails = await this.orderDetail.findByOrder(id);
      const existingMap = new Map(existingDetails.map((d) => [d.id, d]));

      // 💰 PAYMENT LOGIC
      const canManagePreAmount = role < MANAGER;
      const preservedPreAmount = +(order.pre_amount ?? 0);
      if (!canManagePreAmount) {
        payload.pre_amount = preservedPreAmount;
      }
      const paidAmount = +(payload.paid_amount ?? 0);
      const preAmount = canManagePreAmount
        ? +(payload.pre_amount ?? preservedPreAmount)
        : preservedPreAmount;
      const nextTotalAmount = Math.max(normalizedTotalAmount, preAmount, 0);
      const status = payload.order_status || order.order_status;
      payload.total_amount = nextTotalAmount;

      if (order.salary_date && role >= MANAGER) {
        const normalizedExistingDetails = existingDetails.map((detail) => ({
          id: detail.id ?? null,
          service_id: detail.service_id ?? null,
          user_id: detail.user_id ?? null,
          price: +(detail.price ?? 0),
        }));
        const normalizedIncomingDetails = normalizedDetails.map((detail, index) => ({
          id: detail.id ?? normalizedExistingDetails[index]?.id ?? null,
          service_id: detail.service_id ?? null,
          user_id: detail.user_id ?? null,
          price: +(detail.price ?? 0),
        }));
        const lockedFieldsChanged =
          status !== order.order_status ||
          +(nextTotalAmount ?? order.total_amount ?? 0) !==
            +(order.total_amount ?? 0) ||
          +(dto.pre_amount ?? order.pre_amount ?? 0) !== +(order.pre_amount ?? 0) ||
          +(payload.paid_amount ?? order.paid_amount ?? 0) !==
            +(order.paid_amount ?? 0) ||
          (dto.method ?? order.method ?? null) !== (order.method ?? null) ||
          (preMethod ?? order.pre_method ?? null) !==
            (order.pre_method ?? null) ||
          (dto.voucher_id ?? order.voucher_id ?? null) !==
            (order.voucher_id ?? null) ||
          +(dto.discount_type ?? order.discount_type ?? 0) !==
            +(order.discount_type ?? 0) ||
          +(dto.discount ?? order.discount ?? 0) !== +(order.discount ?? 0) ||
          normalizedIncomingDetails.length !== normalizedExistingDetails.length ||
          normalizedIncomingDetails.some((detail, index) => {
            const existing = normalizedExistingDetails[index];
            return (
              !existing ||
              detail.id !== existing.id ||
              detail.service_id !== existing.service_id ||
              detail.user_id !== existing.user_id ||
              detail.price !== existing.price
            );
          });

        if (lockedFieldsChanged) {
          throw new HttpException(
            'Админаас хаасан захиалгын дүнг артист өөрчлөх боломжгүй байна.',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      if (status === OrderStatus.Finished) {
        const total = preAmount + paidAmount;

        const artistAmounts =
          normalizedDetails.length > 1
            ? normalizedDetails.reduce((sum, d) => sum + +(d.price ?? 0), 0)
            : total;

        if (total !== artistAmounts) {
          this.orderError.PAID_AMOUNT_REQUIRED;
        }

        payload.total_amount = total;

        if (normalizedDetails.length === 1 && +normalizedDetails[0].price === 0) {
          normalizedDetails[0].price = total;
        }
      }

      if (order.order_status !== payload.order_status) {
        payload.updated_at = new Date();
      }
      const incomingIds = normalizedDetails.filter((d) => d.id).map((d) => d.id);
      const orderDetailDate = order_date ?? order.order_date;
      const resolvedStartTime = this.normalizeTimeValue(
        `${dto.start_time ?? order.start_time}`,
      );
      const startTimeDecimal = timeToDecimal(resolvedStartTime);
      let startDate = startTimeDecimal;
      const normalizedDurations: number[] = [];
      const detailPayloads: Array<{
        detail: OrderDetailDto;
        prev: any;
        payload: any;
        nickname?: string | null;
      }> = [];

      for (const detail of normalizedDetails) {
        const prev = detail.id ? existingMap.get(detail.id) : null;
        const service = await this.service.findOne(detail.service_id);
        const durationMinutes = this.normalizeDurationMinutes(
          detail.duration ?? +service.duration,
        );
        const duration = durationMinutes / 60;
        const endDate = startDate + duration;
        normalizedDurations.push(durationMinutes);

        const detailPayload: any = {
          ...detail,
          duration: durationMinutes,
          start_time: toTimeString(Math.floor(startDate), startDate % 1 !== 0),
          end_time: toTimeString(Math.floor(endDate), endDate % 1 !== 0),
          status: status,
          view_status: order.status,
          order_date: orderDetailDate,
        };

        let nickname: string | null | undefined;
        if (!prev) {
          const artist = await this.userService.findOne(detail.user_id);
          nickname = artist?.nickname ?? null;
        }

        detailPayloads.push({
          detail,
          prev,
          payload: detailPayload,
          nickname,
        });

        if (parallel) {
          startDate = startTimeDecimal;
        } else {
          startDate = endDate;
        }
      }

      const orderDuration = parallel
        ? Math.max(0, ...normalizedDurations)
        : normalizedDurations.reduce((sum, duration) => sum + duration, 0);
      payload.start_time = resolvedStartTime;
      payload.duration = orderDuration;
      payload.end_time = this.addDurationToTimeString(
        resolvedStartTime,
        orderDuration,
      );

      await this.validateShiftFinishBoundaries({
        branch_id: payload.branch_id ?? order.branch_id,
        order_date: orderDetailDate,
        details: detailPayloads.map(({ payload }) => ({
          user_id: payload.user_id,
          start_time: payload.start_time,
          end_time: payload.end_time,
        })),
      });

      await this.db.withTransaction(async (client) => {
        await this.register_status_logs({
          user,
          order_id: id,
          order_status: payload.order_status,
          client,
        });

        await this.dao.updateTx(
          client,
          { id, ...payload },
          getDefinedKeys(payload),
        );

        // Temporarily hide the order's existing details so resequencing them
        // does not trip the exclusion constraint against their previous slots.
        await this.orderDetail.updateViewStatusTx(client, id, STATUS.Hidden);

        for (const existing of existingDetails) {
          if (!incomingIds.includes(existing.id)) {
            await this.orderDetail.deleteTx(client, existing.id);
          }
        }

        for (const {
          detail,
          prev,
          payload: detailPayload,
          nickname,
        } of detailPayloads) {
          const {
            category_id,
            max_price,
            min_price,
            original_price,
            pre,
            user,
            ...updatePayload
          } = detailPayload;
          if (prev) {
            await this.orderDetail.updateTx(client, detail.id!, updatePayload);
          } else {
            await this.orderDetail.createTx(client, {
              ...updatePayload,
              order_id: id,
              nickname: nickname ?? null,
            } as any);
          }
        }
      });
      const paymentSync = await this.payment.syncManualPayments({
        merchant,
        order_id: id,
        created_by: user,
        method: dto.method,
        pre_method: preMethod,
        paid_amount: paidAmount,
        pre_amount: preAmount,
      });
      if (paymentSync.latestPaidAt && paymentSync.latestMethod != null) {
        await this.syncOrderPaidMeta(
          id,
          paymentSync.latestPaidAt,
          paymentSync.latestMethod,
        );
      } else {
        await this.clearOrderPaidMeta(id);
      }
      await this.updatePrePaid(
        id,
        preAmount == 0 ? true : !!paymentSync.hasPrePayment,
      );
    } catch (error) {
      console.error('Order update failed:', error);
      throw error;
    }
  }
  public async updateStatus(input: {
    id: string;
    order_status: OrderStatus;
    user?: string;
  }) {
    const { user, id, order_status } = input;
    await this.register_status_logs({
      order_id: id,
      user,
      order_status,
    });
    return await this.dao.updateOrderStatus(id, order_status);
  }
  public async updatePaidDate(
    id: string,
    date: Date | null,
    type: string | null,
  ) {
    return await this.dao.updatePaidDate(id, date, type);
  }
  private isFullDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

  private normalizeSalaryDay(value?: number | null) {
    const day = Number(value);
    return Number.isFinite(day) && day > 0 ? day : 5;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private calculateSalaryAmount(price: number, percent?: number | null) {
    const normalizedPercent = Number(percent ?? 0);
    if (!Number.isFinite(price) || !Number.isFinite(normalizedPercent)) {
      return 0;
    }

    return this.roundMoney((price * normalizedPercent) / 100);
  }

  private resolveSalaryPayDate(
    orderDate: Date | string,
    salaryDay?: number | null,
  ) {
    const normalizedSalaryDay = this.normalizeSalaryDay(salaryDay);
    const [year, month, day] = mnDate(orderDate).split('-').map(Number);
    const orderUtc = Date.UTC(year, month - 1, day);
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const anchorMonths = [-1, 0, 1].map((offset) => {
      const value = new Date(monthStart);
      value.setUTCMonth(value.getUTCMonth() + offset);
      return value;
    });

    const payDates = anchorMonths
      .flatMap((anchor) => {
        const first = new Date(
          Date.UTC(
            anchor.getUTCFullYear(),
            anchor.getUTCMonth(),
            normalizedSalaryDay,
          ),
        );
        const second = new Date(first);
        second.setUTCDate(second.getUTCDate() + 15);
        return [first, second];
      })
      .sort((a, b) => a.getTime() - b.getTime());

    const target =
      payDates.find((candidate) => candidate.getTime() >= orderUtc) ??
      payDates[payDates.length - 1];

    return mnDate(target);
  }

  private async finalizeOrderForProcessing(orderId: string, approver?: string) {
    if (approver) {
      await this.register_status_logs({
        user: approver,
        order_id: orderId,
        order_status: OrderStatus.Finished,
      });
    }

    await Promise.all([
      this.dao.updateOrderStatus(orderId, OrderStatus.Finished),
      this.orderDetail.updateStatusByOrder(orderId, OrderStatus.Finished),
    ]);
  }
  public async confirmSalaryProcessStatus(
    approver?: string,
    param?: string,
    endDateParam?: string,
  ) {
    try {
      const date = this.isFullDate(param) ? param : undefined;
      const end_date = this.isFullDate(endDateParam) ? endDateParam : undefined;

      const orders = await this.find(
        {
          limit: -1,
          skip: 0,
          sort: false,
          date: date,
          end_date,
          order_status: OrderStatus.Finished,
        },
        ADMIN,
      );

      const items = await Promise.all(
        orders.items.map(async (order) => {
          if (order.order_status !== OrderStatus.Finished) {
            return undefined;
          }
          await this.dao.updateSalaryProcessStatus(order.id, new Date());
          return order;
        }),
      );
      const confirmedOrders = items?.filter((i) => i !== undefined) ?? [];
      type UserSalaryInfo = {
        amount: number; // нийт цалин
        pay_date: string; // тухайн мөчлөгийн цалин олгох өдөр
        day: number; // цалин авах өдөр (5 | 20)
        order_ids: Set<string>; // давхардалгүй захиалгын тоо
        salary_status: number;
      };

      const users = new Map<string, UserSalaryInfo>();
      const userCache = new Map<
        string,
        { id: string; day: number; percent: number }
      >();

      for (const order of confirmedOrders) {
        // if (order.order_status !== OrderStatus.Finished) {
        //   const customer = order.customer_id;
        //   if (customer) this.checkLevel(customer);
        //   continue;
        // }

        const details = await this.orderDetail.findByOrder(order.id);
        if (!details?.length) continue;

        for (const detail of details) {
          if (!detail.user_id) continue;
          // 🔹 Хэрэглэгчийн мэдээлэл cache-ээс шалгах
          let currentUser = userCache.get(detail.user_id);
          if (!currentUser) {
            const fetchedUser = await this.user.findOne(detail.user_id);
            if (!fetchedUser) continue;

            currentUser = {
              id: fetchedUser.id,
              day: this.normalizeSalaryDay(fetchedUser.salary_day),
              percent: Number(fetchedUser.percent ?? 0),
            };
            userCache.set(detail.user_id, currentUser);
          }

          const payDate = this.resolveSalaryPayDate(
            order.order_date,
            currentUser.day,
          );
          const groupKey = `${detail.user_id}:${payDate}`;

          if (!users.has(groupKey)) {
            users.set(groupKey, {
              amount: 0,
              pay_date: payDate,
              day: currentUser.day,
              order_ids: new Set<string>(),
              salary_status: order.salary_status ?? SALARY_LOG_STATUS.Pending,
            });
          }

          const userData = users.get(groupKey)!;
          const amount = this.calculateSalaryAmount(
            Number(detail.price ?? 0),
            currentUser.percent,
          );

          if (amount > 0) {
            userData.amount += amount;
          }

          userData.order_ids.add(order.id);
          userData.salary_status =
            order.salary_status ?? userData.salary_status;
        }

        const customer = order.customer_id;
        if (customer) this.checkLevel(customer);
      }
      // 🧾 Salary Log-г бүгдийг нэг дор шинэчилнэ
      await Promise.all(
        [...users.entries()]
          .filter(([, data]) => data.amount > 0)
          .map(async ([groupKey, data]) => {
            const [userId] = groupKey.split(':');
            await this.integrationService.updateSalaryLog({
              amount: data.amount,
              approved_by: approver,
              date: data.pay_date,
              day: data.day,
              order_count: data.order_ids.size,
              salary_status: data.salary_status ?? SALARY_LOG_STATUS.Pending,
              artist_id: userId,
            });
          }),
      );
      return {
        count: confirmedOrders.length,
      };
    } catch (error) {
      console.log(error);
    }
  }
  public async level() {
    const keys = [
      'user_level_bronze',
      'user_level_silver',
      'user_level_gold',
      'user_level_bronze_name',
      'user_level_silver_name',
      'user_level_gold_name',
      'artist_level_junior_name',
      'artist_level_senior_name',
    ];
    const config = await this.dao.getConfigValues(keys).catch(() => ({}));
    const numberValue = (key: string, fallback: number) => {
      const value = Number(config?.[key]?.value);
      return Number.isFinite(value) ? value : fallback;
    };
    const textValue = (key: string, fallback: string) => {
      return config?.[key]?.value_text || fallback;
    };

    this.bronze = numberValue('user_level_bronze', this.bronze);
    this.silver = numberValue('user_level_silver', this.silver);
    this.gold = numberValue('user_level_gold', this.gold);
    this.customerLevelNames[UserLevel.BRONZE] = textValue(
      'user_level_bronze_name',
      this.customerLevelNames[UserLevel.BRONZE],
    );
    this.customerLevelNames[UserLevel.SILVER] = textValue(
      'user_level_silver_name',
      this.customerLevelNames[UserLevel.SILVER],
    );
    this.customerLevelNames[UserLevel.GOLD] = textValue(
      'user_level_gold_name',
      this.customerLevelNames[UserLevel.GOLD],
    );
    this.employeeLevelNames[UserLevel.JUNIOR] = textValue(
      'artist_level_junior_name',
      this.employeeLevelNames[UserLevel.JUNIOR],
    );
    this.employeeLevelNames[UserLevel.SENIOR] = textValue(
      'artist_level_senior_name',
      this.employeeLevelNames[UserLevel.SENIOR],
    );

    return {
      customer: {
        [UserLevel.BRONZE]: {
          name: this.customerLevelNames[UserLevel.BRONZE],
          threshold: this.bronze,
        },
        [UserLevel.SILVER]: {
          name: this.customerLevelNames[UserLevel.SILVER],
          threshold: this.silver,
        },
        [UserLevel.GOLD]: {
          name: this.customerLevelNames[UserLevel.GOLD],
          threshold: this.gold,
        },
      },
      employee: {
        [UserLevel.JUNIOR]: {
          name: this.employeeLevelNames[UserLevel.JUNIOR],
        },
        [UserLevel.SENIOR]: {
          name: this.employeeLevelNames[UserLevel.SENIOR],
        },
      },
    };
  }
  public async updateLevel(dto: Record<string, any>) {
    const customer = dto.customer ?? dto;
    const employee = dto.employee ?? {};

    Object.entries(customer).forEach(([k, rawValue]) => {
      const key = Number(k) as UserLevel;
      const item =
        typeof rawValue === 'object' && rawValue !== null
          ? (rawValue as Record<string, any>)
          : null;
      const value =
        item !== null ? Number(item.threshold ?? item.value) : Number(rawValue);
      const name = item !== null ? String(item.name ?? '') : '';

      if (key == UserLevel.BRONZE && Number.isFinite(value)) this.bronze = value;
      if (key == UserLevel.SILVER && Number.isFinite(value)) this.silver = value;
      if (key == UserLevel.GOLD && Number.isFinite(value)) this.gold = value;
      if (name && [UserLevel.BRONZE, UserLevel.SILVER, UserLevel.GOLD].includes(key)) {
        this.customerLevelNames[key] = name;
      }
    });

    Object.entries(employee).forEach(([k, rawValue]) => {
      const key = Number(k) as UserLevel;
      const item =
        typeof rawValue === 'object' && rawValue !== null
          ? (rawValue as Record<string, any>)
          : null;
      const name = item !== null ? String(item.name ?? '') : '';

      if (name && [UserLevel.JUNIOR, UserLevel.SENIOR].includes(key)) {
        this.employeeLevelNames[key] = name;
      }
    });

    await this.dao
      .upsertConfigValues([
        { key: 'user_level_bronze', value: this.bronze },
        { key: 'user_level_silver', value: this.silver },
        { key: 'user_level_gold', value: this.gold },
        {
          key: 'user_level_bronze_name',
          value: 0,
          value_text: this.customerLevelNames[UserLevel.BRONZE],
        },
        {
          key: 'user_level_silver_name',
          value: 0,
          value_text: this.customerLevelNames[UserLevel.SILVER],
        },
        {
          key: 'user_level_gold_name',
          value: 0,
          value_text: this.customerLevelNames[UserLevel.GOLD],
        },
        {
          key: 'artist_level_junior_name',
          value: 0,
          value_text: this.employeeLevelNames[UserLevel.JUNIOR],
        },
        {
          key: 'artist_level_senior_name',
          value: 0,
          value_text: this.employeeLevelNames[UserLevel.SENIOR],
        },
      ])
      .catch((error) => {
        console.error('Level config persist failed:', error);
      });

    return this.level();
  }
  public async checkLevel(user: string) {
    const count = await this.dao.customerCheck(user);
    if (count >= this.gold) {
      await this.user.updateLevel(user, UserLevel.GOLD);
      return;
    }
    if (count >= this.silver) {
      await this.user.updateLevel(user, UserLevel.SILVER);
      return;
    }
    if (count >= this.bronze) {
      await this.user.updateLevel(user, UserLevel.BRONZE);
      return;
    }
  }
  public async updatePrePaid(id: string, paid: boolean) {
    return await this.dao.updatePrePaid(id, paid);
  }

  public async remove(input: { id: string; user: string }) {
    const { user, id } = input;
    const status = STATUS.Hidden;
    await this.register_status_logs({
      order_id: id,
      user,
      status,
    });
    await this.orderDetail.remove(id);
    await this.dao.updateStatus(id, status);
  }

  public async checkCallback(user: string, id: string, order_id: string) {
    try {
      const invoice = await this.payment.findByOrder(order_id);
      if (!invoice?.invoice_id) {
        return { paid: false };
      }

      const res = await this.qpay.checkPayment(invoice.invoice_id);
      if (!res?.paid_amount) {
        return { paid: false };
      }

      const row = res?.rows?.[0];
      await this.payment.markInvoicePaid({
        invoice_id: invoice.invoice_id,
        paid_at: new Date(),
        payment_id: row?.payment_id ?? id,
      });
      await this.updateStatus({
        id: order_id,
        order_status: OrderStatus.Active,
        user,
      });
      await this.orderDetail.updateStatusByOrder(order_id, OrderStatus.Active);
      await this.updatePrePaid(order_id, true);

      return {
        status: OrderStatus.Active,
        paid: true,
      };
    } catch (error) {
      console.error('QPay callback check failed:', error);
      return { paid: false };
    }
  }
}
