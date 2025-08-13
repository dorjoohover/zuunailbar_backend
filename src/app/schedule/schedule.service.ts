import { Injectable } from '@nestjs/common';
import { ScheduleDao } from './schedule.dao';
import { ScheduleDto } from './schedule.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  getDefinedKeys,
  MANAGER,
  mnDate,
  mnDayRange,
  ScheduleStatus,
  startOfISOWeek,
  STATUS,
  toTimeString,
} from 'src/base/constants';
import { User } from '../user/user.entity';

@Injectable()
export class ScheduleService {
  constructor(private readonly dao: ScheduleDao) {}
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
  private normalizeTimes(times: string[], date: Date): number[] {
    const tz = 'Asia/Ulaanbaatar';

    // '9|10|13' эсвэл ['9','10','13']
    const flat =
      times.length === 1 &&
      typeof times[0] === 'string' &&
      times[0].includes('|')
        ? times[0].split('|')
        : times;

    const parsed = flat
      .map((s) => Number(String(s).trim()))
      .filter((n) => Number.isFinite(n))
      .map((n) => Math.floor(n))
      .filter((n) => n >= 0 && n <= 23);

    const unique = Array.from(new Set(parsed)).sort((a, b) => a - b);

    // --- Өдөр харьцуулах түлхүүр функцууд ---
    const dayKey = (y: number, m: number, d: number) => y * 10000 + m * 100 + d;

    // NOW: УБ-ийн өнөөдөр/одоо цаг
    const nowParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const pickNow = (t: string) =>
      Number(nowParts.find((p) => p.type === t)?.value);
    const nowKey = dayKey(pickNow('year'), pickNow('month'), pickNow('day'));
    const nowHour = pickNow('hour');

    // SCHEDULE: UTC өдрийн бүртгэл (YYYY-MM-DD) – time-ийг үл тооцно
    const schUtcParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const pickSch = (t: string) =>
      Number(schUtcParts.find((p) => p.type === t)?.value);
    const schKey = dayKey(pickSch('year'), pickSch('month'), pickSch('day'));

    // Логик
    if (schKey < nowKey) return []; // өнгөрсөн өдөр → хоосон
    if (schKey > nowKey) return unique; // ирээдүй өдөр → бүх цаг OK
    return unique.filter((n) => n > nowHour); // өнөөдөр → одоогийн цагаас хойш
  }
  public async checkSchedule(date: Date, times: string[]) {
    // 1) Өнөөдөр бол одоогоос хойшихоор шүүсэн хүсэлттэй цагууд
    const want: number[] = this.normalizeTimes(times, date);
    const { ymd } = mnDayRange(date);
    if (want.length === 0) return { date: ymd, overlap: [] };
    console.log(want, date);
    const wantSet = new Set(want);

    // 2) Тухайн өдрийн (user_id, "h|h|h") жагсаалт
    // Ж: [{ user_id: 'u1', times: '8|9' }, { user_id: 'u2', times: '10|11' }]
    const rows: Array<{ user_id: string; times: string }> =
      await this.dao.getAvailableTimes(date);

    // 3) User бүрийн times ∩ want = хоосон биш бол л overlap-д нэмнэ
    const overlap = rows.reduce<
      Array<{ user_id: string; times: string; date: string }>
    >((acc, r) => {
      if (!r?.user_id || !r?.times) return acc;

      const inter = r.times
        .split('|')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && wantSet.has(n));

      if (inter.length > 0) {
        const uniq = Array.from(new Set(inter)).sort((a, b) => a - b);
        acc.push({ user_id: r.user_id, times: uniq.join('|'), date: ymd });
      }
      return acc;
    }, []);

    return { overlap };
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
