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
  SALARY_LOG_STATUS,
  STARTTIME,
  STATUS,
  toTimeString,
  ubDateAt00,
  UserLevel,
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
import { UserServiceService } from '../user_service/user_service.service';
import { IntegrationService } from '../integrations/integrations.service';

@Injectable()
export class OrderService {
  private orderError = new OrderError();
  private orderLimit = 7;
  private bronze = 10;
  private silver = 20;
  private gold = 30;
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
    private userService: UserServiceService,
    private integrationService: IntegrationService,
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
    const start_time = +dto.start_time.slice(0, 2);
    if (start_time < STARTTIME || start_time > ENDTIME)
      this.orderError.invalidHour;
    const date = ubDateAt00(dto.order_date);
    date.setHours(+(start_time ?? 0), 0, 0);
    let day = date.getDay() - 1;
    if (day == -1) day = 6;

    const booking = await this.booking.list({
      branch_id: dto.branch_id,
      index: day,
    });
    if (
      (booking.items.length == 0 || booking.items?.[0]?.times == null) &&
      dto.order_status != OrderStatus.Friend
    )
      this.orderError.nonWorkingHour;
    const artist = await this.booking.list({
      branch_id: dto.branch_id,
      index: day,
    });
    if (artist.items.length == 0 || artist.items?.[0]?.times == null)
      this.orderError.artistTimeUnavailable;

    await Promise.all(
      details.map(async (detail) => {
        let order;
        try {
          order = await this.dao.getOrderByDateTime(
            dto.order_date,
            dto.start_time,
            dto.end_time,
            OrderStatus.Cancelled,
            detail.user_id,
          );
        } catch (error) {
          order = null;
        }
        if (order != null && order.length != 0)
          throw order.customer_id == user.id
            ? new OrderError().orderAlreadyPlaced
            : new OrderError().timeConflict;
      }),
    );
  }

  public async getArtists(dto: OrderDto) {
    try {
      const userService = await this.userService.findForClient(
        dto.branch_id,
        dto.services,
      );
      const bookingRes = (
        await this.booking.findAll(
          { limit: 100, skip: 0, sort: false, branch_id: dto.branch_id },
          CLIENT,
        )
      )?.items;
      const bookings = {};
      bookingRes.map((b) => {
        bookings[+b.index] = b.times?.split('|').map(Number);
      });
      const services = Array.from(new Set(dto.services));

      const uniqueUsers = Object.values(
        userService.items.reduce(
          (acc, us) => {
            const uid = us.user.id;
            if (!acc[uid]) acc[uid] = us; // зөвхөн анхныг нь хадгална
            return acc;
          },
          {} as Record<string, (typeof userService.items)[number]>,
        ),
      );
      const artistsWithSlots = await Promise.all(
        uniqueUsers.map(async (us: any) => {
          const artistId = us.user.id;

          // Artist services only (important fix)
          const artistServices = userService.items
            .filter((x) => x.user.id === artistId)
            .map((x) => x.service_id);

          // 6. Weekly schedules of this artist
          const schedulesItems = await this.schedule.findAll(
            { limit: 100, skip: 0, sort: false, user_id: artistId },
            CLIENT,
          );

          // 7. Orders of this artist (for daily occupied time)
          const orders = await this.dao.getOrdersOfArtist(artistId);

          const occupiedSlots = orders.map((o) => {
            const date = new Date(o.order_date);
            let day = date.getDay() - 1;
            if (day === -1) day = 6;

            return {
              day,
              start_time: +o.start_time.slice(0, 2),
              end_time: +o.end_time.slice(0, 2),
            };
          });

          // 8. Available slots per day
          const slotsByDay: Record<string, number[]> = {};

          await Promise.all(
            schedulesItems.items.map(async (schedule) => {
              const { index, times } = schedule;
              const slotTimes = times?.split('|').map(Number) ?? [];

              // Branch booking overlap fix
              const overlaps = slotTimes.filter((t) =>
                bookings[String(index)]?.includes(t),
              );

              if (!overlaps.length) return;

              // Artist orders overlap
              const freeTimes = overlaps.filter((hour) => {
                return !occupiedSlots.some(
                  (o) =>
                    o.day === +index &&
                    hour >= o.start_time &&
                    hour < o.end_time,
                );
              });

              if (freeTimes.length > 0) {
                slotsByDay[index] = freeTimes;
              }
            }),
          );

          if (Object.keys(slotsByDay).length === 0) return null;

          // 9. Parallel mode support
          return {
            ...us,
            artistId,
            slots: slotsByDay,
            services: artistServices, // ✔ only this artist’s services
          };
        }),
      );
      const filteredArtists = artistsWithSlots?.filter(Boolean);
      return { items: filteredArtists, coount: this.orderLimit };
    } catch (error) {
      console.log(error);
    }
  }
  public async updateOrderLimit(limit: number) {
    this.orderLimit = limit;
  }
  public async getUserCount(user: string) {
    const res = await this.dao.customerCheck(user);
    return {
      count: res,
    };
  }
  private async getLastOrderOfArtist(user: string) {
    const results = await this.dao.getOrdersOfArtist(user);
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
      const [hour, minute] = artist.end_time?.split(':').map(Number);
      artistDateTime.setHours(hour, minute, 0, 0); // цаг, минут, секунд, мс
    }
    // dtoDate байхгүй бол өнөөдөр

    let referenceDate = new Date();
    if (dtoDate) {
      const minutes = referenceDate.getMinutes();
      let hour = referenceDate.getHours() + 8;
      minutes > 0 && hour++;
      const day = referenceDate.getDate();
      const date = new Date(dtoDate);
      referenceDate = date;
      if (day == date.getDate()) {
        referenceDate.setHours(hour, 0, 0);
      }
    } else {
      referenceDate.setHours(0, 0, 0);
    }
    if (artistDateTime) {
      return artistDateTime >= referenceDate
        ? {
            date: artistDateTime,
            time: artist.end_time?.split(':').map(Number)[0],
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
    const firstArtist = Object.values(dto.serviceArtist).find(
      (artist): artist is string => !!artist,
    );
    const parallel = Object.values.length > 0;

    let availableTimes: number[] = [];
    let targetDate: Date | undefined;
    if (firstArtist) {
      // 2. Эхний artist-ийн сүүлчийн захиалгыг авах
      const artistOrder = await this.getLastOrderOfArtist(firstArtist);
      // 3. TargetDate-ийг тодорхойлох

      const target = this.getTargetDate({
        artist: artistOrder,
        dtoDate: dto.date,
      });
      targetDate = target.date;

      // 4. Эхний artist-ийн боломжит цагийг авах
      // const artistSchedule = await this.schedule.getAvailableTime(
      //   firstArtist,
      //   targetDate,
      // );
      // 5. Branch-ийн боломжит цагийг авах
      // const branchBooking = await this.booking.getAvailableTime(
      //   dto.branch_id,
      //   targetDate,
      // );

      // 6. Давхцсан цагийг гаргах (intersection)
      // availableTimes = (artistSchedule?.times || []).filter((t) =>
      //   branchBooking?.times?.includes(t),
      // );
      if (target.time) {
        availableTimes = availableTimes?.filter((a) => a >= target.time);
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
      console.log(new Date(), 'start');
      const parallel = dto.parallel;

      // artists.length == 0 || artists?.[0] == '0' && artists =

      const orderDate = mnDate(dto.order_date);
      let pre = 0;
      let duration = 0;
      for (const detail of dto.details ?? []) {
        const service = await this.service.findOne(detail.service_id);
        if (+(service.pre ?? '0') > pre) pre = +service.pre;
        let d = +(service.duration ?? '0');
        if (parallel) {
          if (duration < d) duration = 0;
        } else {
          duration += d;
        }
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
        pre_amount: pre ?? 0,
        is_pre_amount_paid: pre == 0,
        order_status: dto.order_status ?? OrderStatus.Pending,
        status: STATUS.Active,
        branch_id: dto.branch_id,
      } as const;
      console.log(payload);
      await this.canPlaceOrder(
        {
          ...payload,
        },
        user,
        dto.details,
        merchant,
      );

      const order = await this.dao.add(payload);
      let startDate = startHour;

      for (const d of dto.details ?? []) {
        const service = await this.service.findOne(d.service_id);
        const artist = await this.user.findOne(d.user_id);

        const duration = Math.ceil(+service.duration / 60);
        const endDate = startDate + duration;
        await this.orderDetail.create({
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

        if (dto.parallel !== true) startDate = endDate;
      }
      if (pre > 0) {
        const invoice = await this.qpay.createInvoice(
          pre,
          order.id,
          user.id,
          dto.branch_name,
        );
        console.log(new Date(), 'invoice');

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
      ?.filter((h) => !takenLookup[h])
      .sort((a, b) => a - b);
    return remaining;
  }

  public async update(id: string, dto: OrderDto) {
    const { details, branch_id, order_date, ...payload } = dto;
    await this.dao.update({ ...payload, id }, getDefinedKeys(payload));

    const existingDetails = await this.orderDetail.findByOrder(id);

    const existingIds = existingDetails.map((d) => d.id);
    const newIds = details.map((d) => d.id)?.filter(Boolean);

    const toDelete = existingDetails?.filter((d) => !newIds.includes(d.id));

    await Promise.all(
      details.map(async (d) => {
        if (d.id && existingIds.includes(d.id)) {
          await this.orderDetail.update(d.id, { ...d });
        } else {
          await this.orderDetail.create({
            ...d,
            order_id: id,
          });
        }
      }),
    );

    if (toDelete.length > 0) {
      await Promise.all(toDelete.map((d) => this.orderDetail.remove(d.id)));
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
    await Promise.all(
      details.map(async (detail) => {
        await this.orderDetail.remove(detail.id);
      }),
    );
    await this.dao.updateStatus(id, STATUS.Hidden);
  }

  // public async excelAdd() {
  //   const res = await this.excel.readExcel('client');
  //   const artist = await this.user.findOne('2c25b08bc5fc4f86a22bf947c9db5f54');
  //   const merchant = '3f86c0b23a5a4ef89a745269e7849640';
  //   const creater = await this.user.findOne('05e0434bbf4c4dd587a11c3709c889c3');
  //   await Promise.all(
  //     res.map(async (r) => {
  //       const mobile = String(r[1]).trim();
  //       let user;
  //       try {
  //         user = await this.user.findMobile(mobile);
  //       } catch (error) {
  //         user = await this.user.register(
  //           { mobile, password: 'string' },
  //           merchant,
  //         );
  //       }
  //       console.log(user.id);
  //       const service = String(r[4])?.split(';');
  //       const description = String(r[3]);
  //       const date = parse(
  //         r[5]?.replace(/\s+/g, ' '),
  //         'MMM d yyyy h:mma',
  //         new Date(),
  //       );
  //       const hour = date.getHours();

  //       const services = await Promise.all(
  //         service.map(async (s) => {
  //           let ser;
  //           try {
  //             ser = (await this.service.findByName(s)).id;
  //           } catch (error) {
  //             ser = await this.service.create(
  //               {
  //                 branch_id: artist.branch_id,
  //                 description: null,
  //                 duration: 30,
  //                 min_price: 10000,
  //                 max_price: 10000,
  //                 name: s,
  //                 icon: null,
  //                 image: null,
  //                 pre: 10000,
  //                 para: false,
  //                 view: null,
  //               },
  //               merchant,
  //               creater,
  //             );
  //           }
  //           return {
  //             service_id: ser,
  //           };
  //         }),
  //       );
  //       const res = await this.create(
  //         {
  //           order_date: date,
  //           details: services as any,
  //           branch_name: artist.branch_name,
  //           description: null,
  //           discount: null,
  //           discount_type: null,
  //           order_status: OrderStatus.Finished,
  //           paid_amount: 0,
  //           start_time: hour,
  //           total_amount: 0,
  //           user_id: user.id,
  //         },
  //         user.id,
  //         merchant,
  //       );
  //       console.log(res);

  //       // console.log(mobile, mnDate(date), hour);
  //     }),
  //   );
  // }
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
