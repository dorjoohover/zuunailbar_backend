import { Injectable } from '@nestjs/common';
import { ScheduleDao } from './schedule.dao';
import { ScheduleDto, UpdateScheduleDto } from './schedule.dto';
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
    const weekTimes = Array.from({ length: 7 }, (_, i) => dto.times?.[i] ?? '');
    const schedules = await this.dao.getByUser(dto.user_id);
    if (schedules.length > 0) {
      await Promise.all(
        schedules.map(async (schedule, index) => {
          const parts = String(weekTimes[index])
            .split('|')
            .filter(Boolean)
            .map(Number)
            .filter((n) => Number.isFinite(n));
          const bookingParts = String(schedule.times)
            .split('|')
            .filter(Boolean)
            .map(Number)
            .filter((n) => Number.isFinite(n));
          const times = Array.from(new Set([...parts, ...bookingParts])).sort(
            (a, b) => a - b,
          );
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
          branch_id: branch,
          approved_by: user.id,
          schedule_status: ScheduleStatus.Active,
          status: STATUS.Active,
          index: idx,
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

  public async checkSchedule(
    items: Record<string, string | number[] | number>[],
  ): Promise<
    Record<string, { date: string; times: number[]; index: number }[]>
  > {
    console.log(items);
    const wantByDay = new Map<number, { date: string; hours: Set<number> }>();

    for (const obj of items) {
      for (const k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        const [dateStr, dayStr] = String(k).split('|');
        const day = Number(dayStr);
        if (!Number.isFinite(day)) continue;

        const raw = obj[k] as unknown;
        let hours: number[] = [];
        if (Array.isArray(raw)) hours = raw.map(Number);
        else if (typeof raw === 'string')
          hours = raw.split('|').map((s) => Number(s.trim()));
        else if (typeof raw === 'number') hours = [raw];

        // Бохир утгуудыг шүүх
        hours = hours
          .filter((n) => Number.isFinite(n))
          .map((n) => Math.trunc(n));

        const entry = wantByDay.get(day) ?? {
          date: dateStr,
          hours: new Set<number>(),
        };
        for (const h of hours) entry.hours.add(h);
        // date нь зөвхөн буцаахад хэрэглэгдэнэ (хамгийн сүүлийн/эхнийхийг хадгалж болно)
        entry.date = dateStr || entry.date;
        wantByDay.set(day, entry);
      }
    }

    // 2) Буцаах бүтэц
    const byUser: Record<
      string,
      { date: string; times: number[]; index: number }[]
    > = {};

    // 3) Өдөр бүр artist-уудын ээлжийг аваад, хүссэн цагтай огтлолцуулах
    for (const [day, info] of wantByDay) {
      // Тухайн "day" индексийн бүх мөрийг нэг дор авна (N+1-ийг багасгана)
      const rows = await this.findAll(
        { limit: -1, skip: 0, sort: false, index: day },
        CLIENT,
      );
      const artists = Array.isArray(rows?.items) ? rows.items : [];

      // — Artist бүрийн боломжит цагийг олж, захиалгатай давхардлыг хасах ажлыг зэрэгцээ гүйцэтгэнэ
      await Promise.all(
        artists.map(async (r: any) => {
          const userId = r?.user_id;
          if (!userId) return;

          // Artist-ийн ажиллах цагууд: '8|9|10' → [8,9,10]
          const artistHours = String(r?.times ?? '')
            .split('|')
            .map((s: string) => Number(String(s).trim()))
            .filter((n: number) => Number.isFinite(n));
          // Хүссэн цаг (want) ∩ Artist цаг (shift)
          const artistSet = new Set<number>(artistHours);
          const candidate = [...info.hours].filter((h) => artistSet.has(h));
          if (candidate.length === 0) return;
          candidate.sort((a, b) => a - b);

          // Захиалгатай (booked) цагуудыг олж, candidate-оос хасна
          // findByUserDateTime(userId, day, times[]) нь тухайн user-ийн тухайн өдөр захиалгатай цагуудыг буцаана гэж үзэж байна
          const booked: number[] = await this.order.findByUserDateTime(
            userId,
            info.date,
            candidate,
          );
          const bookedSet = new Set<number>((booked ?? []).map(Number));

          const available = candidate.filter((h) => bookedSet.has(h));
          if (available.length === 0) return;
          (byUser[userId] ??= []).push({
            date: info.date, // date нь зөвхөн мэдээллийн зорилгоор
            times: available, // зөвхөн боломжтой цагууд
            index: day, // тухайн өдрийн индекс
          });
        }),
      );
    }
    return byUser;
  }
  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: UpdateScheduleDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, ScheduleStatus.Hidden);
  }
}
