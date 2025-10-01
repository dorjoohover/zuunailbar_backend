import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BookingDao } from './booking.dao';
import { BookingDto } from './booking.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import {
  CLIENT,
  getDefinedKeys,
  mnDate,
  ScheduleStatus,
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
    @Inject(forwardRef(() => ScheduleService))
    private readonly schedule: ScheduleService,
  ) {}
  public async create(dto: BookingDto, merchant: string, user: string) {
    const weekTimes = Array.from({ length: 7 }, (_, i) => dto.times?.[i] ?? '');
    const bookings = await this.dao.getLastWeek(merchant, dto.branch_id);
    console.log(dto, weekTimes, bookings);
    if (bookings?.length > 0) {
      await Promise.all(
        bookings.map(async (schedule, index) => {
          const parts = String(weekTimes[index])
            .split('|')
            .filter(Boolean)
            .map(Number)
            .filter((n) => Number.isFinite(n));
          if (parts.length == 0) return;
          const bookingParts = String(schedule.times)
            .split('|')
            .filter(Boolean)
            .map(Number)
            .filter((n) => Number.isFinite(n));

          const times = [
            ...parts.filter((n) => !bookingParts.includes(n)),
            ...bookingParts.filter((n) => !parts.includes(n)),
          ];
          const start = times[0];
          const end = times[times.length - 1];
          if (times.length > 0) {
            const payload = {
              times: times.length ? times.join('|') : null, // "" хадгална
              start_time: times.length ? toTimeString(start) : null,
              end_time: times.length ? toTimeString(end) : null,
            };
            await this.dao.update(
              { id: schedule.id, ...payload },
              getDefinedKeys(payload),
            );
          }
        }),
      );
      return;
    }
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

        await this.dao.add({
          ...dto,
          id: AppUtils.uuid4(),
          branch_id: dto.branch_id,
          approved_by: user,
          booking_status: ScheduleStatus.Active,
          status: STATUS.Active,
          index: idx,
          times: parts.length ? parts.join('|') : null,
          start_time: parts.length ? toTimeString(start) : null,
          end_time: parts.length ? toTimeString(end) : null,
          merchant_id: merchant,
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

  public async findByDateTime(
    date: string,
    time: number,
    merchant: string,
    branch_id: string,
  ) {
    const jsDay = ubDateAt00(date).getDay();
    const day = jsDay === 0 ? 7 : jsDay;
    return await this.dao.findByDateTime(day - 1, time, merchant, branch_id);
  }

  public async update(id: string, dto: BookingDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, ScheduleStatus.Hidden);
  }
}
