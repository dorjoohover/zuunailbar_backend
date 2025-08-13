import { Injectable } from '@nestjs/common';
import { BookingDao } from './booking.dao';
import { BookingDto } from './booking.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import {
  CLIENT,
  getDefinedKeys,
  mnDate,
  ScheduleStatus,
  startOfISOWeek,
  STATUS,
  toTimeString,
} from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { ScheduleService } from '../schedule/schedule.service';

@Injectable()
export class BookingService {
  constructor(
    private readonly dao: BookingDao,
    private readonly schedule: ScheduleService,
  ) {}
  public async create(dto: BookingDto, merchant: string, user: string) {
    const base = startOfISOWeek(new Date(dto.date)); // Энэ 7 хоногийн Даваа

    // dto.times урт нь 7 биш байж болно → 7 болгож дүүргэнэ
    const weekTimes = Array.from({ length: 7 }, (_, i) => dto.times?.[i] ?? '');

    await Promise.all(
      weekTimes.map(async (timeLine, idx) => {
        // "8|10|12" -> [8,10,12]
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
          merchant_id: merchant,
          approved_by: user,
          booking_status: ScheduleStatus.Pending,
          status: STATUS.Active,

          date: targetDate,
          times: parts.length ? parts.join('|') : '', // "" хадгална
          start_time: parts.length ? toTimeString(start) : null,
          end_time: parts.length ? toTimeString(end) : null,
        });
      }),
    );
  }
  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async findClient(pg: PaginationDto) {
    const res = await this.dao.list(
      applyDefaultStatusFilter({ ...pg, start_date: mnDate() }, CLIENT),
    );
    if (!res.items?.length) {
      return { count: 0, items: [] };
    }
    // N мөрийг зэрэг шалгах
    const checked = await Promise.all(
      res.items.map(async (r) => {
        const want = r.times ? r.times.split('|') : [];
        const { overlap } = await this.schedule.checkSchedule(r.date, want);
        return overlap.length > 0 ? { ...r, overlap } : null;
      }),
    );
    const items = checked.filter((x): x is NonNullable<typeof x> => x !== null);
    return {
      count: items.length,
      items,
    };
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: BookingDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, ScheduleStatus.Hidden);
  }
}
