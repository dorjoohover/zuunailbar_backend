import { Injectable } from '@nestjs/common';
import { OrderDto } from './order.dto';
import { OrdersDao } from './order.dao';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  CLIENT,
  DISCOUNT,
  getDefinedKeys,
  mnDate,
  STATUS,
  toTimeString,
} from 'src/base/constants';
import { AppUtils } from 'src/core/utils/app.utils';
import { OrderDetailService } from '../order_detail/order_detail.service';
import { ServiceService } from '../service/service.service';
import { start } from 'repl';
import { Order } from './order.entity';

@Injectable()
export class OrderService {
  constructor(
    private readonly dao: OrdersDao,
    private readonly orderDetail: OrderDetailService,
    private readonly service: ServiceService,
  ) {}
  private addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  }
  public async create(dto: OrderDto, customerId: string) {
    const totalMinutes = (dto.details ?? []).reduce(
      (sum, it) => sum + (it.duration ?? 0),
      0,
    );
    const durationHours = Math.ceil(totalMinutes / 60);

    const startHour = +dto.start_time;
    const endHourRaw = +startHour + durationHours;

    const dayShift = Math.floor(endHourRaw / 24); // хэдэн өдөр давсан бэ
    const endHour = +endHourRaw;

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
      order_status: STATUS.Active,
      status: STATUS.Active,
      user_desc: null,
    } as const;
    console.log(payload);
    const order = await this.dao.add(payload);
    // 5) details-ийг зэрэг үүсгэнэ
    await Promise.all(
      (dto.details ?? []).map((d) =>
        this.orderDetail.create({
          order_id: order,
          service_id: d.service_id,
          service_name: d.service_name,
          price: d.price,
          duration: d.duration, // минут чигээр нь хадгалж болно
        }),
      ),
    );

    return { id: order.id };
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
  public async findByUserDateTime(
    user_id: string,
    date: string,
    times: number[],
  ) {
    const takenHours = await this.dao.checkTimes({
      user_id,
      start_date: mnDate(new Date(date)),
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
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
