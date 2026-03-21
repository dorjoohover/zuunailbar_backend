import { forwardRef, Inject, Injectable } from '@nestjs/common';
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
    let prev_start_time = dto.start_time;
    if (prev_start_time.length > 2)
      prev_start_time = prev_start_time.slice(0, 2);
    const start_time = +prev_start_time;
    if (start_time < STARTTIME || start_time > ENDTIME)
      this.orderError.invalidHour;
    const date = new Date();
    if (
      user.role == CLIENT &&
      start_time < date.getHours() &&
      isSameDay(date, dto.order_date)
    )
      this.orderError.cannotChooseHour;
  }
  public async getOrderLimit() {
    return await this.dao.getLimit();
  }

  public async getSlots(pg: PaginationDto) {
    let { parallel, branch_id, services } = pg;
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
    const selected_services = await this.service.getCategories(service);

    const categories = selected_services.map((d) => d?.category_id);
    const durations = selected_services.map((d) => Number(d.duration) || 0);
    const needDuration = parallel
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

      if (!hasConflict) {
        validSlots.push(slot);
      }
    }
    return validSlots;
  }
  private isOverlapping(startA: Date, endA: Date, startB: Date, endB: Date) {
    return startA < endB && endA > startB;
  }
  private combineDateTime(date: Date, time: string) {
    const d = new Date(date);

    const [h, m, s] = time.split(':').map(Number);

    d.setHours(h, m, s || 0, 0);

    return d;
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

  public async create(dto: OrderDto, user: User, merchant: string) {
    try {
      const admin = user.role <= ADMIN;
      const parallel = dto.parallel;

      // artists.length == 0 || artists?.[0] == '0' && artists =

      const orderDate = toYMD(new Date(dto.order_date));
      let pre = 0;
      let duration = admin && dto.duration ? +dto.duration : 0;
      for (const detail of dto.details ?? []) {
        const service = await this.service.findOne(detail.service_id);
        if (!service) throw new BadRequest().notFound('Үйлчилгээ');
        if (+(service.pre ?? '0') > pre) pre = +service.pre;
        let d = +(service.duration ?? '0');
        if (parallel) {
          duration = duration < d ? d : duration;
        } else {
          duration += d;
        }
      }
      if (admin && dto.pre_amount) {
        pre = +dto.pre_amount;
      }
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
        pre_amount: dto.pre_amount ?? pre ?? 0,
        is_pre_amount_paid: pre == 0,
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
        const service = await this.service.findOne(d.service_id);
        const artist = await this.user.findOne(d.user_id);

        const duration =
          admin && dto.duration
            ? +dto.duration / (parallel ? 1 : dto.details.length) / 60
            : +service.duration / 60;
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
      const order = await this.dao.create(payload, orderDetails);
      if (
        dto.method == PaymentMethod.P2P &&
        +(dto.pre_amount ?? pre ?? '0') > 0
      ) {
        const invoice = await this.qpay.createInvoice(
          pre,
          order,
          user.id,
          dto.branch_name,
          user.mobile,
        );
        console.log(invoice?.invoice_id, order, user.id, new Date());
        await this.payment.create(
          {
            amount: pre,
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
            price: pre,
            status: OrderStatus.Pending,
            created: new Date(),
          },
        };
      } else {
        // if(payload.paid_amount) {

        //   await this.payment.create({
        //     amount: payload.paid_amount,
        //     created_by: user.id,
        //     is_pre_amount: false,
        //     method: dto.method,
        //     status: dto.order_status
        //   }, merchant)
        // }
        await this.updatePrePaid(order, true);
        await this.dao.updateOrderStatus(order, OrderStatus.Active);
        return { id: order };
      }
    } catch (error) {
      console.log(error);
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

  public async checkPayment(invoiceId: string, id: string, user: string) {
    const res = await this.qpay.checkPayment(invoiceId);
    if (res?.paid_amount) {
      await this.updateStatus({
        id,
        order_status: OrderStatus.Active,
        user,
      });
      const row = res?.rows?.[0];
      if (row) {
        await this.updatePaidDate(id, new Date(), row.payment_type);
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

  public async cancelOrder(id: string) {
    try {
      await this.dao.updateOrderStatus(id, OrderStatus.Absent);
      await this.orderDetail.updateStatusByOrder(id, OrderStatus.Absent);
      return true;
    } catch (error) {
      console.log(error);
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
      console.log(error);
    }
  }

  public async find(pg: PaginationDto, role: number, id?: string) {
    try {
      const query = applyDefaultStatusFilter(
        role == CLIENT ? { ...pg, customer_id: id } : pg,
        role,
      );
      const res = await this.dao.list(query);
      const items = (
        await Promise.all(
          res.items.map(async (item) => {
            const detail = await this.orderDetail.find(
              { ...pg, order_id: item.id },
              role,
            );
            if (detail.items.length == 0) return;

            // Давхар user-уудыг арилгах
            const users = Array.from(
              new Map(
                (detail.items ?? [])
                  ?.filter((d) => d.user)
                  .map((d) => [d.user.id, d.user]),
              ).values(),
            );

            const firstArtist = users[0];

            const branch_id = firstArtist?.branch_id ?? null;

            const user = await this.user.findOne(item.customer_id);

            const order_date = mnDate(new Date(item.order_date));
            const created_by = item.created_by
              ? await this.user.findOne(item.created_by)
              : undefined;

            return {
              ...item,
              order_date,
              customer: user,
              branch_id,
              created_by,
              details: detail.items,
            };
          }),
        )
      )?.filter((d): d is NonNullable<typeof d> => d !== undefined); // ⬅️ энд шүүнэ
      return {
        items,
        count: res.count,
      };
    } catch (error) {
      console.log(error);
    }
  }

  public async getOrders(user: string, day: number) {
    const res = await this.dao.getOrders(user, day);
    return res;
  }

  public async report(pg: PaginationDto, role: number, res: Response) {
    const selectCols = [
      'id',
      'user_id',
      'customer_id',
      'order_date',
      'end_time',
      'discount',
      'discount_type',
      'start_time',
      'total_amount',
    ];

    // 1) үндсэн жагсаалт
    const { items } = await this.dao.list(
      applyDefaultStatusFilter(pg, role),
      selectCols.join(','),
    );

    // 2) user/customer-уудыг багцлаад авах (боломжтой бол findManyByIds ашигла)
    const userIds = Array.from(
      new Set(items.map((x) => x.user_id)?.filter(Boolean)),
    );
    const customerIds = Array.from(
      new Set(items.map((x) => x.customer_id)?.filter(Boolean)),
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
      timeEnd: number;
      discountType: number;
      discount: number;
      amount: number;
    };

    const rows: Row[] = items.map((it: any) => {
      const u = usersMap.get(it.user_id);
      const c = customersMap.get(it.customer_id);

      return {
        artist: usernameFormatter(u) ?? '',
        customer: c?.mobile ? MobileParser(c.mobile) : '',
        customerName: usernameFormatter(c),
        order: it.order_date ? new Date(it.order_date) : '',
        time: it.start_time ?? '',
        timeEnd: it.end_time ?? '',
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
    return await this.orderLog.list(query);
  }
  private async register_status_logs(input: {
    user: string;
    status?: number;
    order_status?: number;
    order_id: string;
  }) {
    const { user, order_status, status, order_id } = input;
    const order = await this.findOne(order_id);
    console.log(user);
    if (!order) return;
    if (
      order_status &&
      order_status == order.order_status &&
      status &&
      status == order.status
    )
      return;
    await this.orderLog.add({
      changed_by: user,
      new_status: status ?? order.status,
      new_order_status: order_status ?? order.order_status,
      old_order_status: order.order_status,
      old_status: order.status,
      order_id,
    });
  }

  public async checkOrders() {
    const res = await this.dao.getCancelOrders();
    await Promise.all(
      res.map(async (r) => {
        await this.updateStatus({
          id: r.id,
          order_status: OrderStatus.Cancelled,
        });
        await this.orderDetail.updateStatusByOrder(r.id, OrderStatus.Cancelled);
      }),
    );
  }

  public async update(id: string, dto: OrderDto, user: string) {
    let { details, parallel, order_date, ...body } = dto;
    let payload = { order_date, ...body };
    try {
      const order = await this.findOne(id);
      if (!order) return;

      const start_time = timeToDecimal(dto.start_time.toString());

      // ⏱ end_time автоматаар бодох
      if (!payload.end_time) {
        const hasHalfHour = start_time % 1 !== 0;
        const duration = +order.duration + (hasHalfHour ? 30 : 0);

        payload.end_time = toTimeString(
          Math.floor(start_time + Math.ceil(duration / 60)),
          hasHalfHour,
        );
      }

      const paidAmount = +(payload.paid_amount ?? 0);
      const preAmount = +(payload.pre_amount ?? 0);
      let status = payload.order_status || order.order_status;
      if (status == OrderStatus.Finished) {
        // if (!hasAnyPrice) {
        //   this.orderError.EMPLOYEE_SERVICE_PRICE_REQUIRED;
        // }

        // if (paidAmount <= 0) {
        //   this.orderError.PAID_AMOUNT_REQUIRED;
        // }

        const total = preAmount + paidAmount;

        const artistAmounts =
          details.length > 1
            ? details.reduce((sum, d) => sum + +(d.price ?? 0), 0)
            : total;

        if (total !== artistAmounts) {
          this.orderError.PAID_AMOUNT_REQUIRED;
        }
        payload.total_amount = total;

        // ганц detail байвал автоматаар үнэ суулгах
        if (details.length === 1 && +details[0].price === 0) {
          details[0].price = total;
        }
      }
      if (order.order_status != payload.order_status) {
        payload.updated_at = new Date();
      }
      await this.register_status_logs({
        user,
        order_id: id,
        order_status: payload.order_status,
      });
      // 1️⃣ Order update
      await this.dao.update({ id, ...payload }, getDefinedKeys(payload));

      // 2️⃣ Existing details
      const existingDetails = await this.orderDetail.findByOrder(id);
      const existingMap = new Map(existingDetails.map((d) => [d.id, d]));

      let startDate = start_time;
      await Promise.all(
        details.map(async (d) => {
          const order_detail_date = order_date ?? order.order_date;
          const prev = d.id ? existingMap.get(d.id) : null;
          const service = await this.service.findOne(d.service_id);
          const dura = +service.duration / 60;
          const endDate = startDate + dura;

          const detailPayload = {
            ...d,
            start_time: toTimeString(
              Math.floor(startDate),
              startDate % 1 !== 0,
            ),
            view_status: order.status,
            status: status,
            order_date: order_detail_date,
            end_time: toTimeString(Math.floor(endDate), endDate % 1 !== 0),
          };
          const { category_id, duration, ...updatePayload } =
            detailPayload as any;
          if (prev) {
            await this.orderDetail.update(d.id, updatePayload);
          } else {
            const artist = await this.userService.findOne(d.user_id);
            await this.orderDetail.create({
              ...updatePayload,
              order_id: id,
              nickname: artist?.nickname ?? null,
            });
          }
          startDate = endDate;
        }),
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
  public async updatePaidDate(id: string, date: Date, type: string) {
    return await this.dao.updatePaidDate(id, date, type);
  }
  private isFullDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
  public async confirmSalaryProcessStatus(
    approver: string,
    param?: string,
    id?: string,
  ) {
    let date = this.isFullDate(param) ? param : undefined;

    const orders = await this.find(
      {
        limit: 1000,
        skip: 0,
        sort: false,
        date: date,
      },
      ADMIN,
    );

    const items = await Promise.all(
      orders.items.map(async (order) => {
        const status = order.order_status;
        if (
          status == OrderStatus.Finished ||
          status == OrderStatus.Friend ||
          status == OrderStatus.Active
        ) {
          await this.dao.updateSalaryProcessStatus(order.id, new Date());
          return order;
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

    console.log(
      `✅ Processed ${Object.keys(users).length} users for salary update.`,
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
        let key = k as unknown as UserLevel;
        if (key == UserLevel.BRONZE) this.bronze = value;
        if (key == UserLevel.SILVER) this.silver = value;
        if (key == UserLevel.GOLD) this.gold = value;
      }),
    );
  }
  public async checkLevel(user: string) {
    const count = await this.dao.customerCheck(user);
    if (count >= this.gold) {
      await this.userService.updateLevel(user, UserLevel.GOLD);
      return;
    }
    if (count >= this.silver) {
      await this.userService.updateLevel(user, UserLevel.SILVER);
      return;
    }
    if (count >= this.bronze) {
      await this.userService.updateLevel(user, UserLevel.BRONZE);
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
        await this.dao.getById(order_id);
        await this.updateStatus({
          id: order_id,
          order_status: OrderStatus.Active,
          user,
        });
        await this.updatePaidDate(order_id, new Date(), res.transaction_type);
      } catch (error) {
        throw error;
      }
    }
  }
}
