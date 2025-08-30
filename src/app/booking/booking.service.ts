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
  ubDateAt00,
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
    const date = ubDateAt00(base);
    const bookings = await this.dao.findByDate(date, merchant, dto.branch_id);
    if (bookings?.length > 0) {
      await Promise.all(
        bookings.map(async (booking, index) => {
          const parts = String(weekTimes[index])
            .split('|')
            .filter(Boolean)
            .map(Number)
            .filter((n) => Number.isFinite(n));
          const bookingParts = String(booking.times)
            .split('|')
            .filter(Boolean)
            .map(Number)
            .filter((n) => Number.isFinite(n));
          const times = Array.from(new Set([...parts, ...bookingParts])).sort(
            (a, b) => a - b,
          );
          const start = times[0];
          const end = times[times.length - 1];
          const payload = {
            times: times.length ? times.join('|') : null,
            start_time: times.length ? toTimeString(start) : null,
            end_time: times.length ? toTimeString(end) : null,
          };
          await this.dao.update(
            { ...payload, id: booking.id },
            getDefinedKeys(payload),
          );
        }),
      );
      return;
    }
    const targetDate = date;
    await Promise.all(
      weekTimes.map(async (timeLine, idx) => {
        // "8|10|12" -> [8,10,12]
        console.log(timeLine);
        const parts = String(timeLine)
          .split('|')
          .filter(Boolean)
          .map(Number)
          .filter((n) => Number.isFinite(n))
          .sort((a, b) => a - b);

        const start = parts[0];
        const end = parts[parts.length - 1];
        targetDate.setDate(base.getDate() + idx);

        await this.dao.add({
          ...dto,
          id: AppUtils.uuid4(),
          merchant_id: merchant,
          approved_by: user,
          booking_status: ScheduleStatus.Pending,
          status: STATUS.Active,

          date: targetDate,
          times: parts.length ? parts.join('|') : null,
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
    const date = mnDate();
    const res = await this.dao.list(
      applyDefaultStatusFilter({ ...pg, start_date: date, times: -1 }, CLIENT),
    );
    if (!res.items?.length) {
      return { count: 0, items: [] };
    }
    // N мөрийг зэрэг шалгах
    const items: Record<string, number[]>[] = await Promise.all(
      res.items.map((r) => {
        const d = new Date(r.date);
        if (r.times == null) return;
        const date = new Date(d);
        const key = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ulaanbaatar',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(date);
        const day = date.getUTCDay();
        const times: number[] = (r.times ?? '')
          .split('|')
          .map((s) => s.trim())
          .filter((s) => s !== '')
          .map((s) => Number(s))
          .filter((n) => Number.isFinite(n));

        return { [`${key}|${day}`]: times };
      }),
    );

    const overlap = await this.schedule.checkSchedule(items);

    return {
      count: items.length,
      items: [{ overlap }],
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
