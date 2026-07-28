import { forwardRef, HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { ScheduleDao } from './schedule.dao';
import { ScheduleDto, ScheduleWeekDto } from './schedule.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  getDefinedKeys,
  ScheduleStatus,
  slotTimeToDecimal,
  slotRangeToTimes,
  timeToDecimal,
  toTimeString,
  toYMD,
} from 'src/base/constants';
import { BadRequest } from 'src/common/error';
import { UserService } from '../user/user.service';
import { ScheduleListType } from './schedule.entity';
import { OrderService } from '../order/order.service';

/** Долоо хоногийн өдрийн индекс: 0=Даваа ... 6=Ням (view-үүдтэй ижил томьёо). */
function weekdayIndex(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(`${date}T00:00:00Z`) : date;
  return (d.getUTCDay() + 6) % 7;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toYMD(d);
}

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    private readonly dao: ScheduleDao,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
  ) {}

  private normalizeFinishTime(
    times: string[] | undefined | null,
    finish_time?: string | null,
  ) {
    if (finish_time == null || finish_time === '') return null;
    if (!times?.length) return finish_time;

    const lastStart = Math.max(...times.map(slotTimeToDecimal));
    const finish = timeToDecimal(finish_time);

    if (finish <= lastStart) {
      throw new HttpException(
        'Тарах цаг нь сүүлийн авах цагаас хойш байх ёстой.',
        400,
      );
    }

    return toTimeString(Math.floor(finish), finish % 1 !== 0);
  }

  /**
   * Нэг өдрийн хуваарийг upsert хийнэ (user_id, date) түлхүүрээр.
   * `is_generated=false` — учир нь энэ бол admin-ийн гараар өгсөн (эсвэл
   * гараар өөрчилсөн) эх сурвалж мөр.
   */
  private async upsertDay(
    artist: { id: string; branch_id: string; mobile: string; nickname: string; color: number },
    input: {
      date: string;
      times: string[];
      finish_time?: string | null;
      branch_id?: string;
    },
    approvedBy: string,
  ) {
    if (!input.times || input.times.length === 0) {
      throw new BadRequest().notFound('Цаг');
    }

    const existing = await this.dao.findOne(artist.id, input.date);
    if (existing) {
      await this.dao.deleteSchedule(existing.id);
    }

    const { times, start_time, end_time } = slotRangeToTimes(input.times);
    const finish_time = this.normalizeFinishTime(input.times, input.finish_time);
    const meta = {
      mobile: artist.mobile,
      nickname: artist.nickname,
      color: artist.color,
    };

    const id = AppUtils.uuid4();
    await this.dao.add({
      id,
      user_id: artist.id,
      approved_by: approvedBy,
      schedule_status: ScheduleStatus.Active,
      date: input.date,
      index: weekdayIndex(input.date),
      times,
      start_time,
      end_time,
      finish_time,
      // Тухайн өдрийн branch override, эсвэл артистын үндсэн салбар.
      branch_id: input.branch_id ?? artist.branch_id,
      is_generated: false,
      source_schedule_id: null,
      meta,
    } as any);

    return id;
  }

  /** Single-day upsert (өмнөх `create()`-тэй ижил гадаад API, шинэ `date` түлхүүртэй). */
  public async create(dto: ScheduleDto, u: string) {
    if (!dto.date) {
      throw new HttpException('Огноо (date) заавал шаардлагатай.', 400);
    }
    if (!dto.user_id) {
      throw new HttpException(
        'Боломжтой сул цагтай артист энэ цагт байхгүй байна',
        400,
      );
    }
    const artist = await this.userService.findOne(dto.user_id);
    if (!artist) {
      throw new HttpException(
        'Боломжтой сул цагтай артист энэ цагт байхгүй байна',
        400,
      );
    }

    await this.upsertDay(
      artist as any,
      {
        date: dto.date,
        times: dto.times,
        finish_time: dto.finish_time,
        branch_id: dto.branch_id,
      },
      u,
    );

    this.orderService.invalidateSlotsCache(dto.branch_id ?? artist.branch_id);

    // Энэ огнооноос хойш зөвхөн автоматаар үүсгэгдсэн (is_generated=true)
    // мөрүүдийг устгаад, дараагийн generation-оор шинэ эх сурвалжаас дахин
    // зөв тооцоолуулна (cascade forward, admin-ийн гараар тавьсан ирээдүйн
    // долоо хоногуудыг хөндөхгүй).
    await this.dao.deleteGeneratedFrom(dto.user_id, dto.date);
    await this.ensureAvailabilityWindow();
  }

  /**
   * Артистад бүтэн долоо хоногийн (эсвэл дурын хэдэн өдрийн) хуваарийг нэг
   * дор admin-аас тавина. Дараа нь автомат generation window-г шинэчилнэ.
   */
  public async setWeek(dto: ScheduleWeekDto, approvedBy: string) {
    if (!dto.days?.length) {
      throw new HttpException('Дор хаяж нэг өдөр өгнө үү.', 400);
    }
    const artist = await this.userService.findOne(dto.user_id);
    if (!artist) {
      throw new HttpException('Артист олдсонгүй.', 400);
    }

    const sortedDates = [...dto.days].map((d) => d.date).sort();
    for (const day of dto.days) {
      await this.upsertDay(artist as any, day, approvedBy);
    }

    // Тавьсан өдрүүдийн хамгийн сүүлчийнхээс хойших автомат мөрүүдийг
    // цэвэрлээд дахин generate хийлгэнэ (шинэ эх сурвалжаас forward-fill).
    const lastDate = sortedDates[sortedDates.length - 1];
    await this.dao.deleteGeneratedFrom(dto.user_id, lastDate);

    this.orderService.invalidateSlotsCache(artist.branch_id);
    return this.ensureAvailabilityWindow();
  }

  /**
   * app_config.availability_days-аар тодорхойлогдсон цонхыг (өнөөдрөөс хойш)
   * артист бүрийн хувьд бүрэн бөглөгдсөн байлгана:
   *   - Аль хэдийн мөртэй огноог хөндөхгүй (admin-ийн тавьсан ч, өмнө нь
   *     автоматаар үүссэн ч адилхан).
   *   - Мөр байхгүй огноо бүрт: 7 хоногийн өмнөх (эсвэл цаашид `maxLookbackWeeks`
   *     хүртэл) ижил гарагийн хамгийн сүүлийн мөрийг хуулж, `is_generated=true`
   *     гэж тэмдэглэнэ.
   *   - Артистад ямар ч түүхэн мөр олдохгүй бол алгасна (default schedule-гүй).
   */
  public async ensureAvailabilityWindow(): Promise<{
    artists: number;
    created: number;
  }> {
    const days = await this.dao.getAvailabilityDays();
    const today = toYMD(new Date());
    const targetEnd = addDays(today, days);

    const artists = await this.dao.listDistinctArtists();
    let created = 0;
    const affectedBranches = new Set<string>();

    for (const userId of artists) {
      const existingDates = await this.dao.listDatesInRange(
        userId,
        today,
        targetEnd,
      );

      let cursor = today;
      while (cursor <= targetEnd) {
        if (!existingDates.has(cursor)) {
          const source = await this.dao.findSourceForDate(userId, cursor);
          if (source) {
            const id = AppUtils.uuid4();
            await this.dao.add({
              id,
              user_id: userId,
              approved_by: source.approved_by,
              schedule_status: ScheduleStatus.Active,
              date: cursor,
              index: weekdayIndex(cursor),
              times: source.times,
              start_time: source.start_time,
              end_time: source.end_time,
              finish_time: source.finish_time,
              branch_id: source.branch_id,
              is_generated: true,
              source_schedule_id: source.id,
              meta: source.meta,
            } as any);
            created += 1;
            if (source.branch_id) affectedBranches.add(source.branch_id);
          }
        }
        cursor = addDays(cursor, 1);
      }
    }

    for (const branchId of affectedBranches) {
      this.orderService.invalidateSlotsCache(branchId);
    }

    this.logger.log(
      `ensureAvailabilityWindow: ${artists.length} artist(s), ${created} row(s) generated (window ${today}..${targetEnd})`,
    );
    return { artists: artists.length, created };
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }
  public async list(filter: ScheduleListType) {
    return await this.dao.list(filter);
  }
  public async findByArtist(artist: string) {
    return await this.dao.list({
      user_id: artist,
    });
  }
  /** Тухайн артистын өгөгдсөн долоо хоногийн (7 өдөр) мөрүүдийг буцаана. */
  public async getWeek(user_id: string, weekStart: string) {
    const weekEnd = addDays(weekStart, 6);
    return await this.dao.list({
      user_id,
      date_from: weekStart,
      date_to: weekEnd,
      schedule_status: ScheduleStatus.Active,
    });
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }
  public async search(pg: PaginationDto) {
    return await this.dao.search(pg);
  }
  public async update(id: string, dto: ScheduleDto) {
    const schedule = await this.findOne(id);
    if (!schedule) return;
    const range = dto.times === undefined ? {} : slotRangeToTimes(dto.times);
    const nextTimes = dto.times ?? schedule.times?.split('|') ?? [];

    if (dto.times !== undefined || dto.finish_time !== undefined) {
      this.normalizeFinishTime(
        nextTimes,
        dto.finish_time === undefined ? schedule.finish_time : dto.finish_time,
      );
    }

    const payload: any = { ...dto, ...range, id };
    if (dto.date) {
      payload.index = weekdayIndex(dto.date);
    }
    // Гараар засварласан тул цаашид автоматаар дахин бичигдэхгүй байх ёстой.
    payload.is_generated = false;
    payload.source_schedule_id = null;

    if (dto.finish_time !== undefined) {
      payload.finish_time = this.normalizeFinishTime(
        nextTimes,
        dto.finish_time,
      );
    }

    const res = await this.dao.update(payload, getDefinedKeys(payload, true));
    const branchId = payload.branch_id ?? schedule.branch_id;
    if (branchId) {
      this.orderService.invalidateSlotsCache(branchId);
    }
    // Энэ мөрийг гараар өөрчилсөн тул цаашдын автомат үргэлжлэлийг цэвэрлээд
    // дахин generate хийлгэнэ.
    if (schedule.date) {
      await this.dao.deleteGeneratedFrom(schedule.user_id, toYMD(schedule.date));
      await this.ensureAvailabilityWindow();
    }
    return res;
  }

  public async removeByDate(user_id: string, date: string) {
    const schedules = await this.dao.list({
      date,
      user_id,
    });
    await Promise.all(
      (schedules?.items ?? []).map(async (schedule) => {
        await this.dao.deleteSchedule(schedule.id);
      }),
    );
    const branchId = schedules?.items?.[0]?.branch_id;
    if (branchId) {
      this.orderService.invalidateSlotsCache(branchId);
    }
  }
}
