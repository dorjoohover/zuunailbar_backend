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
  toTimeString,
  toYMD,
  UserLevel,
  usernameFormatter,
  UserStatus,
} from 'src/base/constants';
import { AppUtils } from 'src/core/utils/app.utils';
import { OrderDetailService } from '../order_detail/order_detail.service';
import { ServiceService } from '../service/service.service';
import { Order } from './order.entity';
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
import { AvailabilitySlotsService } from '../availability_slots/availability_slots.service';
import { PaymentService } from '../payment/payment.service';

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
    // @Inject(forwardRef(() => PaymentService))
    private payment: PaymentService,
    private slot: AvailabilitySlotsService,
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
    if (client == null || client.role != CLIENT) this.orderError.clientNotFound;
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

    const slots = await this.slot.findAll({
      branch_id: dto.branch_id,
      date: dto.order_date,
      slots: [+dto.start_time?.slice(0, 2)],
      artists: details.map((d) => d.user_id),
    });
    if (slots.items.length == 0 && dto.order_status != OrderStatus.Friend)
      this.orderError.artistTimeUnavailable;
  }

  public async updateOrderLimit(limit: number) {
    this.slot.updateOrderLimit(limit);
  }
  public async getUserCount(user: string) {
    const res = await this.dao.customerCheck(user);
    return {
      count: res,
    };
  }

  public async create(dto: OrderDto, user: User, merchant: string) {
    try {
      console.log(new Date(), 'start');
      const parallel = dto.parallel;

      // artists.length == 0 || artists?.[0] == '0' && artists =

      const orderDate = toYMD(new Date(dto.order_date));
      let pre = 0;
      let duration = 0;
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
      if (user.role == ADMIN && dto.pre_amount) {
        pre = +dto.pre_amount;
      }
      const durationHours = Math.ceil(duration / 60);

      const startHour = +dto.start_time.toString().slice(0, 2);

      const endHourRaw = +startHour + durationHours;
      const endHour = dto.end_time ? +dto.end_time : +endHourRaw;

      // 4) DB-д TIME талбар руу "HH:00:00" гэх мэтээр бичнэ
      const payload: Order = {
        id: AppUtils.uuid4(),
        customer_id: dto.customer_id ?? user.id,
        order_date: orderDate, // Date (өдөр давсан бол +1, +2 ...)
        start_time: toTimeString(startHour),
        end_time: toTimeString(endHour),
        duration: durationHours,
        description: dto.description ?? null,
        discount_type: dto.discount_type ?? null,
        discount: dto.discount ?? null,
        total_amount: dto.total_amount ?? null,
        paid_amount: dto.paid_amount ?? null,
        pre_amount: dto.pre_amount ?? pre ?? 0,
        is_pre_amount_paid: pre == 0,
        order_status:
          user.role == ADMIN
            ? OrderStatus.Active
            : (dto.order_status ?? OrderStatus.Pending),
        status: STATUS.Active,
        branch_id: dto.branch_id,
      } as const;
      await this.canPlaceOrder(
        {
          ...payload,
          start_time: dto.start_time.toString(),
        },
        user,
        dto.details,
        merchant,
      );

      const order = await this.dao.add(payload);
      let startDate = startHour;
      let details = {};
      for (const d of dto.details ?? []) {
        const service = await this.service.findOne(d.service_id);
        const artist = await this.user.findOne(d.user_id);

        const duration = Math.ceil(+service.duration / 60);
        const endDate = startDate + duration;
        const detail = await this.orderDetail.create({
          id: AppUtils.uuid4(),
          start_time: toTimeString(startDate),
          end_time: toTimeString(endDate),
          order_id: order,
          service_id: service.id,
          service_name: service.name,
          price: d.price,
          duration: service.duration,
          nickname: artist.nickname,
          description: d.description,
          user_id: artist.id ?? d.user_id,
        });
        details[service.id] = detail;

        if (dto.parallel !== true) startDate = endDate;
      }

      await Promise.all(
        dto.details.map(async (detail) => {
          await this.slot.updateByArtistAndSlot(
            detail.user_id,
            orderDate,
            `${startHour}`,
            'REMOVE',
          );
        }),
      );
      console.log(dto.method, dto.pre_amount, pre);
      if (dto.method == PaymentMethod.P2P && +(dto.pre_amount ?? '0') > 0) {
        const invoice = await this.qpay.createInvoice(
          pre,
          order.id,
          user.id,
          dto.branch_name,
        );
        console.log(new Date(), 'invoice', invoice);
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
        console.log('first', new Date());
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
        console.log('second', new Date());
        return { id: order };
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async checkPayment(invoiceId: string, id: string) {
    const res = await this.qpay.checkPayment(invoiceId);
    if (res?.paid_amount) {
      await this.updateStatus(id, OrderStatus.Active);
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
    // const orders = await this.dao.getOrderWithDetail(id)
    // await Promise.all(orders.map(async (order) => {
    //   await this.slot.createByArtist(order.user_id, toYMD(order.order_date))
    // }))
    await this.dao.updateOrderStatus(id, OrderStatus.Cancelled);
    return true;
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

            if (
              pg.user_id &&
              !detail.items.some((d) => d.user_id !== pg.user_id)
            ) {
              return undefined;
            }

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

            return {
              ...item,
              order_date,
              customer: user,
              branch_id,
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

  public async getOrders(user: string) {
    const res = await this.dao.getOrders(user);
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

  public async update(id: string, dto: OrderDto) {
    const { details, order_date, ...payload } = dto;

    try {
      // 1️⃣ Order update
      await this.dao.update({ id, ...payload }, getDefinedKeys(payload));

      // 2️⃣ Existing details map (O(1) lookup)
      const existingDetails = await this.orderDetail.findByOrder(id);
      const existingMap = new Map(existingDetails.map((d) => [d.id, d]));

      const incomingIds = details.map((d) => d.id).filter(Boolean);

      // 3️⃣ Handle create / update
      await Promise.all(
        details.map(async (d) => {
          const prev = d.id ? existingMap.get(d.id) : null;

          // ✏️ UPDATE
          if (prev) {
            // slot change
            if (prev.start_time !== d.start_time) {
              await this.slot.updateByArtistAndSlot(
                d.user_id,
                order_date.toString(),
                prev.start_time,
                'ADD',
              );
              await this.slot.updateByArtistAndSlot(
                d.user_id,
                order_date.toString(),
                d.start_time,
                'REMOVE',
              );
            }

            await this.orderDetail.update(d.id, d);
            return;
          }

          // ➕ CREATE
          await this.orderDetail.create({
            ...d,
            order_id: id,
          });

          await this.slot.updateByArtistAndSlot(
            d.user_id,
            order_date.toString(),
            d.start_time,
            'REMOVE',
          );
        }),
      );

      // 4️⃣ Handle delete
      const toDelete = existingDetails.filter(
        (d) => !incomingIds.includes(d.id),
      );

      await Promise.all(
        toDelete.map(async (d) => {
          await this.orderDetail.remove(d.id);

          await this.slot.updateByArtistAndSlot(
            d.user_id,
            order_date.toString(),
            d.start_time,
            'ADD',
          );
        }),
      );
    } catch (error) {
      console.error('Order update failed:', error);
      // throw error;
    }
  }
  public async updateStatus(id: string, status: OrderStatus) {
    return await this.dao.updateOrderStatus(id, status);
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
      order_status: number;
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
            order_status: order.order_status,
          };
        }

        const userData = users[detail.user_id];
        console.log(detail.price);
        const amount = +detail.price || 0;
        const orderDate = new Date(order.order_date);

        // 🔹 Цалин нэмэх
        console.log(userData.amount, amount);
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
          order_status: data.order_status,
          user_id: userId,
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

  public async remove(id: string) {
    const details = await this.orderDetail.findByOrder(id);
    const order = await this.dao.getById(id);
    await Promise.all(
      details.map(async (detail) => {
        await this.slot.updateByArtistAndSlot(
          detail.user_id,
          order.order_date,
          order.start_time,
          'ADD',
        );
        await this.orderDetail.remove(detail.id);
      }),
    );
    await this.dao.updateStatus(id, STATUS.Hidden);
  }

  public async checkCallback(user: string, id: string, order_id: string) {
    const res = await this.qpay.getInvoice(id);

    if (res.status === 'PAID') {
      try {
        await this.dao.getById(order_id);
        await this.updateStatus(order_id, OrderStatus.Active);
      } catch (error) {
        throw error;
      }
    }
  }
}
