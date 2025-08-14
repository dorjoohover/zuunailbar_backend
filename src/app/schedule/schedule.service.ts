import { Injectable } from '@nestjs/common';
import { ScheduleDao } from './schedule.dao';
import { ScheduleDto } from './schedule.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  CLIENT,
  getDefinedKeys,
  mnDate,
  ScheduleStatus,
  startOfISOWeek,
  STATUS,
  toTimeString,
} from 'src/base/constants';
import { User } from '../user/user.entity';
import { OrderService } from '../order/order.service';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly dao: ScheduleDao,
    private readonly order: OrderService,
  ) {}
  public async create(dto: ScheduleDto, branch: string, user: User) {
    const base = startOfISOWeek(new Date(dto.date)); // Энэ 7 хоногийн Даваа

    const weekTimes = Array.from({ length: 7 }, (_, i) => dto.times?.[i] ?? '');

    await Promise.all(
      weekTimes.map(async (timeLine, idx) => {
        const parts = String(timeLine)
          .split('|')
          .filter(Boolean)
          .map(Number)
          .filter((n) => Number.isFinite(n))
          .sort((a, b) => a - b);

        const start = parts[0];
        const end = parts[parts.length - 1];

        const targetDate = new Date(base);
        targetDate.setDate(base.getDate() + idx); // 0=Даваа, 1=Мягмар, ...

        await this.dao.add({
          ...dto,
          id: AppUtils.uuid4(),
          branch_id: branch,
          approved_by: user.id,
          schedule_status: ScheduleStatus.Active,
          status: STATUS.Active,
          date: targetDate,
          times: parts.length ? parts.join('|') : null, // "" хадгална
          start_time: parts.length ? toTimeString(start) : null,
          end_time: parts.length ? toTimeString(end) : null,
        });
      }),
    );
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async checkSchedule(items: Record<string, number[]>[]) {
    // 1) wants → date -> { hour:1 } lookup болгоно
    const wantByDate: Record<string, Record<number, 1>> = {};
    for (let i = 0; i < items.length; i++) {
      const obj = items[i] || {};
      for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        const hours = obj[key] || [];
        const map: Record<number, 1> = (wantByDate[key] ??= {});
        for (let j = 0; j < hours.length; j++) {
          const n = Number(hours[j]);
          if (Number.isFinite(n)) map[n] = 1;
        }
      }
    }

    // 2) УБ YMD formatter (DB-ийн date-ийг өдрөөр тааруулахад)
    const ymdUB = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ulaanbaatar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);

    // 3) DB-ээс мөрүүдээ авна (танай findAll логикаар)
    const rows = await this.findAll(
      { limit: -1, skip: 0, sort: false, start_date: mnDate() },
      CLIENT,
    );

    // 4) user_id -> [{ date: 'YYYY-MM-DD', times: number[] }, ...]
    const byUser: Record<string, { date: string; times: number[] }[]> = {};

    for (let i = 0; i < rows.items.length; i++) {
      const r = rows.items[i];
      if (!r?.user_id) continue;
      const day = ymdUB(new Date(r.date));
      const wantHours = wantByDate[day];
      if (!wantHours) continue; // зөвхөн хүссэн өдрүүд дээр ажиллана

      // r.times: '8|9|10' → [8,9,10], дараа нь wantHours-тай огтлолцол
      const seen: Record<number, 1> = {};
      const parts = String(r.times || '')
        .split('|')
        .map((s) => Number(String(s).trim()))
        .filter((n) => Number.isFinite(n) && wantHours[n]);

      for (let k = 0; k < parts.length; k++) seen[parts[k]] = 1;
      const inter = Object.keys(seen)
        .map(Number)
        .sort((a, b) => a - b);
      const orders = await this.order.findByUserDateTime(r.user_id, day, inter);

      if (orders.length) {
        (byUser[r.user_id] ??= []).push({ date: day, times: orders });
      }
    }

    return { overlap: byUser };
  }
  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: ScheduleDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, ScheduleStatus.Hidden);
  }
}
