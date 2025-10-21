import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AvailableTimeDto, OrderDto } from './order.dto';
import { OrdersDao } from './order.dao';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  ADMIN,
  CLIENT,
  DISCOUNT,
  EMPLOYEE,
  ENDTIME,
  firstLetterUpper,
  getDefinedKeys,
  MANAGER,
  mnDate,
  OrderStatus,
  STARTTIME,
  STATUS,
  toTimeString,
  ubDateAt00,
  usernameFormatter,
  UserStatus,
} from 'src/base/constants';
import { AppUtils } from 'src/core/utils/app.utils';
import { OrderDetailService } from '../order_detail/order_detail.service';
import { ServiceService } from '../service/service.service';
import { start } from 'repl';
import { Order } from './order.entity';
import { QpayService } from './qpay.service';
import { ExcelService } from 'src/excel.service';
import { Response } from 'express';
import { UserService } from '../user/user.service';
import { MobileFormat, MobileParser } from 'src/common/formatter';
import { parse } from 'date-fns';
import { User } from '../user/user.entity';
import { OrderError } from 'src/common/error';
import { OrderDetailDto } from '../order_detail/order_detail.dto';
import { BookingService } from '../booking/booking.service';
import { ScheduleService } from '../schedule/schedule.service';

@Injectable()
export class OrderService {
  private orderError = new OrderError();
  private orderLimit = 7;
  constructor(
    private readonly dao: OrdersDao,
    private readonly orderDetail: OrderDetailService,
    private readonly service: ServiceService,
    private readonly user: UserService,
    private excel: ExcelService,
    private booking: BookingService,
    @Inject(forwardRef(() => ScheduleService))
    private schedule: ScheduleService,
    private qpay: QpayService,
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
    let artist;
    try {
      artist = await this.user.findOne(dto.user_id);
    } catch (error) {
      artist = null;
    }
    if (artist == null || (artist.role <= EMPLOYEE && artist >= MANAGER))
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
    const start_time = +dto.start_time.slice(0, 2);
    if (start_time < STARTTIME || start_time > ENDTIME)
      this.orderError.invalidHour;
    const date = ubDateAt00(dto.order_date);
    date.setHours(+(start_time ?? 0), 0, 0);

    const booking = await this.booking.findByDateTime(
      dto.order_date as string,
      start_time,
      merchant,
      artist.branch_id,
    );
    if (
      (booking == null || !booking.isTimeAvailable) &&
      dto.order_status != OrderStatus.Friend
    )
      this.orderError.nonWorkingHour;
    const schedule = await this.schedule.findByUserDateTime(
      dto.user_id,
      dto.order_date as string,
      start_time,
    );
    if (schedule == null || !schedule.isTimeAvailable)
      this.orderError.artistTimeUnavailable;

    let order;
    try {
      order = await this.dao.getOrderByDateTime(
        dto.order_date,
        dto.start_time,
        dto.end_time,
        OrderStatus.Cancelled,
        dto.user_id,
      );
    } catch (error) {
      order = null;
    }

    if (order != null && order.length != 0)
      throw order.customer_id == user.id
        ? new OrderError().orderAlreadyPlaced
        : new OrderError().timeConflict;
  }
  public async updateOrderLimit(limit: number) {
    this.orderLimit = limit;
  }
  private async getLastOrderOfArtist(user: string) {
    const results = await this.dao.getLastOrderOfArtist(user);
    return results[0];
  }
  private getTargetDate({
    dtoDate,
    artist,
  }: {
    dtoDate?: Date;
    artist?: Order;
  }) {
    let artistDateTime: Date | undefined;

    if (artist) {
      artistDateTime = new Date(artist.order_date);
      const [hour, minute] = artist.end_time.split(':').map(Number);
      artistDateTime.setHours(hour, minute, 0, 0); // цаг, минут, секунд, мс
    }
    // dtoDate байхгүй бол өнөөдөр
    const referenceDate = ubDateAt00(dtoDate) || ubDateAt00();
    if (artistDateTime) {
      return artistDateTime >= referenceDate
        ? {
            date: artistDateTime,
            time: artist.end_time.split(':').map(Number)[0],
          }
        : {
            date: referenceDate,
          };
    }

    return {
      date: referenceDate,
    };
  }
  public async getAvailableTimes(dto: AvailableTimeDto) {
    console.log(dto);
    const firstArtist = Object.values(dto.serviceArtist).find(
      (artist): artist is string => !!artist,
    );

    let availableTimes: number[] = [];
    let targetDate: Date | undefined;
    console.log('firstArtist', firstArtist);
    if (firstArtist) {
      // 2. Эхний artist-ийн сүүлчийн захиалгыг авах
      const artistOrder = await this.getLastOrderOfArtist(firstArtist);
      console.log(artistOrder);
      // 3. TargetDate-ийг тодорхойлох

      const target = this.getTargetDate({
        artist: artistOrder,
        dtoDate: dto.date,
      });
      console.log(target);
      targetDate = target.date;

      // 4. Эхний artist-ийн боломжит цагийг авах
      const artistSchedule = await this.schedule.getAvailableTime(
        firstArtist,
        targetDate,
      );
      console.log(artistSchedule, 'schedules');
      // 5. Branch-ийн боломжит цагийг авах
      const branchBooking = await this.booking.getAvailableTime(
        dto.branch_id,
        targetDate,
      );
      console.log(branchBooking, 'branch');

      // 6. Давхцсан цагийг гаргах (intersection)
      availableTimes = (artistSchedule?.times || []).filter((t) =>
        branchBooking?.times?.includes(t),
      );
      console.log(target);
      if (target.time) {
        availableTimes = availableTimes.filter((a) => a >= target.time);
      }
    }
    return {
      date: targetDate,
      times: availableTimes,
      limit: this.orderLimit,
    };
  }
  public async create(dto: OrderDto, user: User, merchant: string) {
    try {
      const totalMinutes = (dto.details ?? []).reduce(
        (sum, it) => sum + (it.duration ?? 0),
        0,
      );

      const durationHours = Math.ceil(totalMinutes / 60);

      const startHour = +dto.start_time.toString().slice(0, 2);
      const endHourRaw = +startHour + durationHours;

      const dayShift = Math.floor(endHourRaw / 24); // хэдэн өдөр давсан бэ
      const endHour = dto.end_time ? +dto.end_time : +endHourRaw;

      const orderDate = mnDate(dto.order_date);
      // 4) DB-д TIME талбар руу "HH:00:00" гэх мэтээр бичнэ
      const payload: Order = {
        id: AppUtils.uuid4(),
        customer_id: dto.customer_id ?? user.id,
        user_id: dto.user_id,
        order_date: orderDate, // Date (өдөр давсан бол +1, +2 ...)
        start_time: toTimeString(startHour),
        end_time: toTimeString(endHour),
        duration: durationHours,
        customer_desc: dto.customer_desc ?? null,
        discount_type: dto.discount_type ?? null,
        discount: dto.discount ?? null,
        total_amount: dto.total_amount ?? null,
        paid_amount: dto.paid_amount ?? null,
        pre_amount: dto.pre_amount ?? 10000,
        is_pre_amount_paid: true,
        order_status: dto.order_status ?? OrderStatus.Pending,
        status: STATUS.Pending,
        user_desc: dto.user_desc ?? null,
      } as const;
      await this.canPlaceOrder(
        {
          ...payload,
        },
        user,
        dto.details,
        merchant,
      );

      const order = await this.dao.add(payload);
      let pre = 0;
      await Promise.all(
        (dto.details ?? []).map(async (d) => {
          const service = await this.service.findOne(d.service_id);
          pre += service.pre;
          await this.orderDetail.create({
            id: AppUtils.uuid4(),
            order_id: order,
            service_id: service.id,
            service_name: service.name,
            price: service.price,
            duration: service.duration,
          });
        }),
      );
      if (pre > 0) {
        const invoice = await this.qpay.createInvoice(
          pre,
          order.id,
          user.id,
          dto.branch_name,
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
    await this.dao.updateOrderStatus(id, OrderStatus.Cancelled);
    return true;
  }

  public async find(pg: PaginationDto, role: number) {
    try {
      const res = await this.dao.list(applyDefaultStatusFilter(pg, role));
      const items = await Promise.all(
        res.items.map(async (item) => {
          const detail = await this.orderDetail.find(
            { ...pg, order_id: item.id },
            role,
          );
          const artist = await this.user.findOne(item.user_id);
          const artist_name = `${firstLetterUpper(artist.nickname ?? '')} ${MobileFormat(artist.mobile)}`;
          const user = await this.user.findOne(item.customer_id);
          const user_name = `${MobileFormat(user.mobile)} ${firstLetterUpper(user.nickname ?? '')}`;
          return {
            ...item,
            artist_name,
            user_name,
            branch_id: artist.branch_id,
            color: artist.color,
            details: detail.items,
          };
        }),
      );
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
      new Set(items.map((x) => x.user_id).filter(Boolean)),
    );
    const customerIds = Array.from(
      new Set(items.map((x) => x.customer_id).filter(Boolean)),
    );

    const [usersArr, customersArr] = await Promise.all([
      Promise.all(userIds.map((id) => this.user.findOne(id))),
      Promise.all(customerIds.map((id) => this.user.findOne(id))),
    ]);

    const usersMap = new Map(
      usersArr.filter(Boolean).map((u: any) => [u.id, u]),
    );
    const customersMap = new Map(
      customersArr.filter(Boolean).map((c: any) => [c.id, c]),
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
  public async findByUserDateTime(
    user_id: string,
    date: string,
    times: number[],
  ) {
    const takenHours = await this.dao.checkTimes({
      user_id,
      start_date: date,
      times,
    });
    if (takenHours.length === 0) {
      // авсан зүйл алга → бүх хүссэн цаг боломжтой
      return times.sort((a, b) => a - b);
    }

    // 4) times - takenHours  (авсан цагийг ХАСНА)
    const takenLookup: Record<number, 1> = {};
    for (let i = 0; i < takenHours.length; i++) takenLookup[takenHours[i]] = 1;

    const remaining = times
      .filter((h) => !takenLookup[h])
      .sort((a, b) => a - b);
    return remaining;
  }

  public async update(id: string, dto: OrderDto) {
    const { details, ...payload } = dto;
    await this.dao.update({ ...payload, id }, getDefinedKeys(payload));
    await Promise.all(
      details.map(async (detail) => {
        await this.orderDetail.remove(detail.id);
        await this.orderDetail.create({ ...detail, order_id: id });
      }),
    );
  }
  public async updateStatus(id: string, status: OrderStatus) {
    return await this.dao.updateOrderStatus(id, status);
  }
  public async updatePrePaid(id: string, paid: boolean) {
    return await this.dao.updatePrePaid(id, paid);
  }

  public async remove(id: string) {
    const details = await this.orderDetail.findByOrder(id);
    await Promise.all(
      details.map(async (detail) => {
        await this.orderDetail.remove(detail.id);
      }),
    );
    await this.dao.updateStatus(id, STATUS.Hidden);
  }

  public async excelAdd() {
    const res = await this.excel.readExcel('client');
    const artist = await this.user.findOne('2c25b08bc5fc4f86a22bf947c9db5f54');
    const merchant = '3f86c0b23a5a4ef89a745269e7849640';
    const creater = await this.user.findOne('05e0434bbf4c4dd587a11c3709c889c3');
    await Promise.all(
      res.map(async (r) => {
        const mobile = String(r[1]).trim();
        let user;
        try {
          user = await this.user.findMobile(mobile);
        } catch (error) {
          user = await this.user.register(
            { mobile, password: 'string' },
            merchant,
          );
        }
        console.log(user.id);
        const service = String(r[4])?.split(';');
        const description = String(r[3]);
        const date = parse(
          r[5]?.replace(/\s+/g, ' '),
          'MMM d yyyy h:mma',
          new Date(),
        );
        const hour = date.getHours();

        const services = await Promise.all(
          service.map(async (s) => {
            let ser;
            try {
              ser = (await this.service.findByName(s)).id;
            } catch (error) {
              ser = await this.service.create(
                {
                  branch_id: artist.branch_id,
                  description: null,
                  duration: 30,
                  min_price: 10000,
                  max_price: 10000,
                  name: s,
                  icon: null,
                  image: null,
                  pre_amount: 10000,
                  duplicated: false,
                },
                merchant,
                creater,
              );
            }
            return {
              service_id: ser,
            };
          }),
        );
        const res = await this.create(
          {
            order_date: date,
            details: services as any,
            branch_name: artist.branch_name,
            customer_desc: null,
            discount: null,
            discount_type: null,
            order_status: OrderStatus.Finished,
            paid_amount: 0,
            start_time: hour,
            total_amount: 0,
            user_desc: description,
            user_id: user.id,
          },
          user.id,
          merchant,
        );
        console.log(res);

        // console.log(mobile, mnDate(date), hour);
      }),
    );
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
