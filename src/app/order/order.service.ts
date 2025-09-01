import { Injectable } from '@nestjs/common';
import { OrderDto } from './order.dto';
import { OrdersDao } from './order.dao';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  CLIENT,
  DISCOUNT,
  firstLetterUpper,
  getDefinedKeys,
  mnDate,
  OrderStatus,
  STATUS,
  toTimeString,
  usernameFormatter,
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
import { MobileParser } from 'src/common/formatter';

@Injectable()
export class OrderService {
  constructor(
    private readonly dao: OrdersDao,
    private readonly orderDetail: OrderDetailService,
    private readonly service: ServiceService,
    private readonly user: UserService,
    private excel: ExcelService,
    private qpay: QpayService,
  ) {}
  private addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  }
  public async create(dto: OrderDto, customerId: string) {
    try {
      const totalMinutes = (dto.details ?? []).reduce(
        (sum, it) => sum + (it.duration ?? 0),
        0,
      );
      const durationHours = Math.ceil(totalMinutes / 60);

      const startHour = +dto.start_time;
      const endHourRaw = +startHour + durationHours;

      const dayShift = Math.floor(endHourRaw / 24); // хэдэн өдөр давсан бэ
      const endHour = dto.end_time ? +dto.end_time : +endHourRaw;

      const orderDate = new Date(dto.order_date);
      const effectiveOrderDate = dayShift
        ? this.addDays(orderDate, dayShift)
        : orderDate;

      // 4) DB-д TIME талбар руу "HH:00:00" гэх мэтээр бичнэ
      const payload: Order = {
        id: AppUtils.uuid4(),
        customer_id: customerId,
        user_id: dto.user_id,
        order_date: effectiveOrderDate, // Date (өдөр давсан бол +1, +2 ...)
        start_time: toTimeString(startHour),
        end_time: toTimeString(endHour),
        duration: durationHours,
        customer_desc: dto.customer_desc ?? null,
        discount_type: dto.discount_type ?? null,
        discount: dto.discount ?? null,
        total_amount: dto.total_amount ?? null,
        paid_amount: dto.paid_amount ?? null,
        pre_amount: 10000,
        is_pre_amount_paid: true,
        order_status: dto.order_status ?? OrderStatus.Pending,
        status: STATUS.Active,
        user_desc: null,
      } as const;
      const order = await this.dao.add(payload);
      // 5) details-ийг зэрэг үүсгэнэ
      await Promise.all(
        (dto.details ?? []).map(async (d) => {
          const service = await this.service.findOne(d.service_id);
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

      // const invoice = await this.qpay.createInvoice(
      //   10000,
      //   order.id,
      //   customerId,
      //   dto.branch_name,
      // );
      // return { id: order.id, invoice: '' };
    } catch (error) {
      console.log(error);
    }
  }

  async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async find(pg: PaginationDto, role: number) {
    const res = await this.dao.list(applyDefaultStatusFilter(pg, role));
    const items = await Promise.all(
      res.items.map(async (item) => {
        const detail = await this.orderDetail.find(
          { ...pg, order_id: item.id },
          role,
        );
        return {
          ...item,
          details: detail.items,
        };
      }),
    );
    return {
      items,
      count: res.count,
    };
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
        await this.orderDetail.create(detail);
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
