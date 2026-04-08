import {
  HttpException,
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

@Injectable()
export class OrderService {
  private orderError = new OrderError();
  public orderLimit = 7;
  private bronze = 10;
  private silver = 20;
  private gold = 30;
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
    const { parallel, branch_id, services } = pg;
    let artists = [];
    let result: Slot[] = [];

    const p = parallel === 'true';
    const service = services ? services.split(',') : [];
    if (services) {
      if (service.length > 0) {
        const artists_res = await this.userService.getByServices({
          services: service,
          parallel: p,
          branch_id,
        });
        artists = artists_res.map((r) => r.user_id);
      }
    }
    const selected_services = await this.service.getBookingConfigs(
      service,
      branch_id,
    );

    const categories = selected_services.map((d) => d?.category_id);
    const durations = selected_services.map((d) => Number(d.duration) || 0);
    const needDuration = p
      ? Math.max(0, ...durations)
      : durations.reduce((a, b) => a + b, 0);

    result = await this.dao.getSlotsUnified({
      branch_id,
      artists,
      categories,
      parallel: p,
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
      const canManagePreAmount = user.role < MANAGER;
      if ((dto.details?.length ?? 0) <= 0) this.orderError.serviceNotSelected;
      const parallel = dto.parallel;
      const serviceConfigs = await this.service.getBookingConfigs(
        (dto.details ?? []).map((detail) => detail.service_id),
        dto.branch_id,
      );
      const serviceMap = new Map(serviceConfigs.map((service) => [service.id, service]));

      // artists.length == 0 || artists?.[0] == '0' && artists =

      const orderDate = toYMD(new Date(dto.order_date));
      let pre = 0;
      let duration = admin && dto.duration ? +dto.duration : 0;
      for (const detail of dto.details ?? []) {
        const service = serviceMap.get(detail.service_id);
        if (!service) throw new BadRequest().notFound('Үйлчилгээ');
        if (+(service.pre ?? '0') > pre) pre = +service.pre;
        const d = +(detail.duration ?? service.duration ?? '0');
        if (parallel) {
          duration = duration < d ? d : duration;
        } else {
          duration += d;
        }
      }
      if (admin && dto.pre_amount) {
        pre = +dto.pre_amount;
      }
      const orderPreAmount = canManagePreAmount
        ? +(dto.pre_amount ?? pre ?? 0)
        : +(pre ?? 0);
      const durationHours = duration / 60; // 👈 хамгийн зөв

      const startHour = timeToDecimal(dto.start_time.toString()); // ж: 12.5
      const endHourRaw = startHour + durationHours;
      const endHour = endHourRaw;

      const start_time = toTimeString(
        Math.floor(startHour),
        startHour % 1 != 0,
      );

      const end_time = dto.end_time
        ? dto.end_time
        : toTimeString(Math.floor(endHour), endHour % 1 != 0);
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
        discount: dto.discount ?? null,
        total_amount: dto.total_amount ?? null,
        paid_amount: dto.paid_amount ?? null,
        pre_amount: orderPreAmount,
        is_pre_amount_paid: orderPreAmount == 0,
        order_status,
        status: STATUS.Active,
        parallel,
        created_by: user.id,
        branch_id: dto.branch_id,
      } as const;
      if (!admin) {
        await this.canPlaceOrder(
          {
            ...payload,
            start_time: dto.start_time.toString(),
          },
          user,
          dto.details,
          merchant,
        );
      }
      let startDate = startHour;
      const orderDetails = [];
      for (const d of dto.details ?? []) {
        const service = serviceMap.get(d.service_id);
        if (!service) throw new BadRequest().notFound('Үйлчилгээ');
        const artist = await this.user.findOne(d.user_id);

        const duration =
          admin && dto.duration
            ? Math.ceil(
                (+dto.duration / (parallel ? 1 : dto.details.length) / 60) * 2,
              ) / 2
            : Math.ceil((+service.duration / 60) * 2) / 2;

        const endDate = startDate + duration;
        orderDetails.push({
          id: AppUtils.uuid4(),
          start_time: toTimeString(Math.floor(startDate), startDate % 1 != 0),
          end_time: toTimeString(Math.floor(endDate), endDate % 1 != 0),
          service_id: service.id,
          order_date: orderDate,
          service_name: service.name,
          price: d.price,
          duration: service.duration,
          nickname: artist.nickname,
          description: d.description,
          status: order_status,
          view_status: STATUS.Active,
          user_id: artist.id ?? d.user_id,
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

      const order = await this.dao.create(payload, orderDetails);
      if (dto.method == PaymentMethod.P2P && orderPreAmount > 0) {
        const invoice = await this.qpay.createInvoice(
          orderPreAmount,
          order,
          user.id,
          dto.branch_name,
          user.mobile,
        );
        await this.payment.create(
          {
            amount: orderPreAmount,
            is_pre_amount: true,
            created_by: user.id,
            invoice_id: invoice.invoice_id,
            qr_image: invoice.qr_image,
            qr_text: invoice.qr_text,
            status: PAYMENT_STATUS.Pending,
            method: PaymentMethod.P2P,
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
          paid_amount: Number(dto.paid_amount ?? 0),
          pre_amount: orderPreAmount,
        });
        await this.syncOrderPaidMeta(
          order,
          paymentSync.latestPaidAt,
          paymentSync.latestMethod,
        );
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
    const res = await this.qpay.checkPayment(invoiceId);
    if (res?.paid_amount) {
      const row = res?.rows?.[0];
      const payment = await this.payment.markInvoicePaid({
        invoice_id: invoiceId,
        paid_at: new Date(),
        payment_id: row?.payment_id,
      });
      await this.updateStatus({
        id,
        order_status: OrderStatus.Active,
        user,
      });
      if (row) {
        await this.updatePaidDate(id, payment?.paid_at ?? new Date(), row.payment_type);
      }
      return {
        status: OrderStatus.Active,
        paid: true,
      };
    }
    return {
      paid: false,
    };
  }

  public async cancelOrder(id: string, user: string, role: number) {
    try {
      await this.ensureOrderAccess(id, user, role);
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
        const branch_id = detailItems?.[0]?.branch_id;
        return {
          ...item,
          order_date: mnDate(new Date(item.order_date)),
          customer: customerMap.get(item.customer_id),
          created_by: creatorMap.get(item.created_by),
          branch_id,
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
    const details = await this.orderDetail.findByOrderIds(items.map((item) => item.id));
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
        new Set(detailItems.map((detail) => detail.service_name).filter(Boolean)),
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
    if (
      order_status &&
      order_status == order.order_status &&
      status &&
      status == order.status
    )
      return;
    const payload = {
      changed_by: user,
      new_status: status ?? order.status,
      new_order_status: order_status ?? order.order_status,
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
        const invoice = await this.payment.findByOrder(r.id);
        let payment;
        try {
          payment = await this.qpay.checkPayment(invoice?.invoice_id);
        } catch (error) {
          payment = null;
        }

        const order_status = payment?.paid_amount
          ? OrderStatus.Active
          : OrderStatus.Cancelled;
        await this.updateStatus({
          id: r.id,
          order_status,
        });
        await this.orderDetail.updateStatusByOrder(r.id, order_status);
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
    const { details = [], parallel, order_date, ...body } = dto;
    const payload = { order_date, ...body };
    try {
      const order = await this.findOne(id);
      if (!order) return;
      if (details.length <= 0) this.orderError.serviceNotSelected;

      const start_time = timeToDecimal(dto.start_time.toString());
      const orderDuration = parallel
        ? Math.max(...details.map((d) => d.duration))
        : details.reduce((sum, d) => sum + (d.duration ?? 0), 0);
      // ⏱ end_time auto calculate
      if (!payload.end_time) {
        const hasHalfHour = start_time % 1 !== 0;
        const duration = +orderDuration + (hasHalfHour ? 30 : 0);

        payload.end_time = toTimeString(
          Math.floor(start_time + Math.ceil(duration / 60)),
          hasHalfHour,
        );
      }

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
      const status = payload.order_status || order.order_status;

      if (status === OrderStatus.Finished) {
        const total = preAmount + paidAmount;

        const artistAmounts =
          details.length > 1
            ? details.reduce((sum, d) => sum + +(d.price ?? 0), 0)
            : total;

        if (total !== artistAmounts) {
          this.orderError.PAID_AMOUNT_REQUIRED;
        }

        payload.total_amount = total;

        if (details.length === 1 && +details[0].price === 0) {
          details[0].price = total;
        }
      }

      if (order.order_status !== payload.order_status) {
        payload.updated_at = new Date();
      }

      const existingDetails = await this.orderDetail.findByOrder(id);
      const existingMap = new Map(existingDetails.map((d) => [d.id, d]));
      const incomingIds = details.filter((d) => d.id).map((d) => d.id);
      const orderDetailDate = order_date ?? order.order_date;
      let startDate = start_time;
      const detailPayloads: Array<{
        detail: OrderDetailDto;
        prev: any;
        payload: any;
        nickname?: string | null;
      }> = [];

      for (const detail of details) {
        const prev = detail.id ? existingMap.get(detail.id) : null;
        const service = await this.service.findOne(detail.service_id);
        const duration = Number(detail.duration ?? +service.duration) / 60;
        const endDate = startDate + duration;

        const detailPayload: any = {
          ...detail,
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
          startDate = start_time;
        } else {
          startDate = endDate;
        }
      }

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

        await this.dao.updateTx(client, { id, ...payload }, getDefinedKeys(payload));

        for (const existing of existingDetails) {
          if (!incomingIds.includes(existing.id)) {
            await this.orderDetail.deleteTx(client, existing.id);
          }
        }

        for (const { detail, prev, payload: detailPayload, nickname } of detailPayloads) {
          const { category_id, ...updatePayload } = detailPayload;
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
        paid_amount: paidAmount,
        pre_amount: preAmount,
      });
      await this.syncOrderPaidMeta(
        id,
        paymentSync.latestPaidAt,
        paymentSync.latestMethod,
      );
      await this.updatePrePaid(id, preAmount == 0 ? true : !!paymentSync.hasPrePayment);
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
  public async updatePaidDate(id: string, date: Date, type: string) {
    return await this.dao.updatePaidDate(id, date, type);
  }
  private isFullDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
  private async finalizeOrderForProcessing(
    orderId: string,
    approver?: string,
  ) {
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
    const date = this.isFullDate(param) ? param : undefined;
    const end_date = this.isFullDate(endDateParam) ? endDateParam : undefined;

    const orders = await this.find(
      {
        limit: 1000,
        skip: 0,
        sort: false,
        date: date,
        end_date,
      },
      ADMIN,
    );

    const items = await Promise.all(
      orders.items.map(async (order) => {
        let status = order.order_status;

        if (status == OrderStatus.Active) {
          await this.finalizeOrderForProcessing(order.id, approver);
          status = OrderStatus.Finished;
        }

        if (order.salary_date) return;

        if (status == OrderStatus.Finished || status == OrderStatus.Friend) {
          await this.dao.updateSalaryProcessStatus(order.id, new Date());
          return {
            ...order,
            order_status: status,
          };
        }
      }),
    );
    const confirmedOrders = items?.filter((i) => i !== undefined);
    type UserSalaryInfo = {
      amount: number; // нийт цалин
      order_date: Date; // хамгийн эртний/сүүлийн захиалгын огноо
      day: number; // цалин авах өдөр (5 | 15)
      order_count: number; // нийт авсан захиалгын тоо
      salary_status: number;
    };

    const users: Record<string, UserSalaryInfo> = {};
    const userCache = new Map<string, { id: string; day: number }>();

    for (const order of confirmedOrders) {
      const details = await this.orderDetail.findByOrder(order.id);
      if (!details?.length) continue;

      for (const detail of details) {
        if (!detail.user_id) continue;
        // 🔹 Хэрэглэгчийн мэдээлэл cache-ээс шалгах
        let currentUser = userCache.get(detail.user_id);
        if (!currentUser) {
          const fetchedUser = await this.user.findOne(detail.user_id);
          if (!fetchedUser) continue;

          currentUser = { id: fetchedUser.id, day: fetchedUser.day ?? 1 };
          userCache.set(detail.user_id, currentUser);
        }

        // 🔹 Users объект үүсгээгүй бол шинэ үүсгэнэ
        if (!users[detail.user_id]) {
          users[detail.user_id] = {
            amount: 0,
            order_date: new Date(order.order_date),
            day: currentUser.day,
            order_count: 0,
            salary_status: order.salary_status,
          };
        }

        const userData = users[detail.user_id];
        const amount = +detail.price || 0;
        const orderDate = new Date(order.order_date);

        // 🔹 Цалин нэмэх
        userData.amount += amount;

        // 🔹 Захиалгын тоо нэмэх
        userData.order_count += 1;

        // 🔹 Хэрвээ хамгийн сүүлийн order_date хадгалах бол:
        if (orderDate > userData.order_date) {
          userData.order_date = orderDate;
        }

        // 🔹 Хэрвээ хамгийн эртний өдөр хадгалах бол:
        if (orderDate < userData.order_date) {
          userData.order_date = orderDate;
        }
      }

      const customer = order.customer_id;
      if (customer) this.checkLevel(customer);
    }
    // 🧾 Salary Log-г бүгдийг нэг дор шинэчилнэ
    await Promise.all(
      Object.entries(users).map(async ([userId, data]) => {
        await this.integrationService.updateSalaryLog({
          amount: data.amount,
          approved_by: approver,
          date: data.order_date,
          day: data.day,
          order_count: data.order_count,
          salary_status: data.salary_status,
          artist_id: userId,
        });
      }),
    );
    return {
      count: confirmedOrders.length,
    };
  }
  public async level() {
    return {
      [UserLevel.BRONZE]: this.bronze,
      [UserLevel.SILVER]: this.silver,
      [UserLevel.GOLD]: this.gold,
    };
  }
  public async updateLevel(dto: Record<UserLevel, number>) {
    await Promise.all(
      Object.entries(dto).map(([k, value], i) => {
        const key = k as unknown as UserLevel;
        if (key == UserLevel.BRONZE) this.bronze = value;
        if (key == UserLevel.SILVER) this.silver = value;
        if (key == UserLevel.GOLD) this.gold = value;
      }),
    );
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
    const res = await this.qpay.getInvoice(id);

    if (res.status === 'PAID') {
      try {
        const invoice = await this.payment.findByOrder(order_id);
        const payment = invoice?.invoice_id
          ? await this.payment.markInvoicePaid({
              invoice_id: invoice.invoice_id,
              paid_at: new Date(),
              payment_id: id,
            })
          : null;
        await this.dao.getById(order_id);
        await this.updateStatus({
          id: order_id,
          order_status: OrderStatus.Active,
          user,
        });
        await this.updatePaidDate(
          order_id,
          payment?.paid_at ?? new Date(),
          res.transaction_type,
        );
      } catch (error) {
        throw error;
      }
    }
  }
}
