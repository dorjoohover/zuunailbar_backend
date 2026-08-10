import {
  forwardRef,
  HttpException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { BookingDao } from './booking.dao';
import {
  BookingDto,
  BookingListType,
  BookingWeekDto,
  SetBranchLeaveDto,
} from './booking.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import {
  getDefinedKeys,
  ScheduleStatus,
  slotTimeToDecimal,
  slotRangeToTimes,
  timeToDecimal,
  toTimeString,
  toYMD,
} from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { BadRequest } from 'src/common/error';
import { BranchService } from '../branch/branch.service';
import { OrderService } from '../order/order.service';

/** Долоо хоногийн өдрийн индекс: 0=Даваа ... 6=Ням (schedule модультой ижил томьёо). */
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
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly dao: BookingDao,
    @Inject(forwardRef(() => BranchService))
    private readonly branchService: BranchService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
  ) {}

  /** Тухайн салбарын merchant_id-г олно (bookings.merchant_id NOT NULL тул). */
  private async resolveMerchantId(branch_id: string): Promise<string> {
    const branch = await this.branchService.findOne(branch_id);
    if (!branch?.merchant_id) {
      throw new HttpException('Салбарын merchant олдсонгүй.', 400);
    }
    return branch.merchant_id;
  }

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
        'Дуусах цаг нь сүүлийн авах цагаас хойш байх ёстой.',
        400,
      );
    }

    return toTimeString(Math.floor(finish), finish % 1 !== 0);
  }

  /** Нэг өдрийн (branch_id, date) хуваарийг upsert хийнэ. */
  private async upsertDay(
    branch_id: string,
    input: {
      date: string;
      times: string[];
      finish_time?: string | null;
    },
    approvedBy: string,
    merchant_id?: string,
  ) {
    if (!input.times || input.times.length === 0) {
      throw new BadRequest().notFound('Цаг');
    }

    const existing = await this.dao.findOne(branch_id, input.date);
    if (existing) {
      await this.dao.deleteBooking(existing.id);
    }

    const { times, start_time, end_time } = slotRangeToTimes(input.times);
    const finish_time = this.normalizeFinishTime(
      input.times,
      input.finish_time,
    );
    // bookings.merchant_id NOT NULL тул context-оос ирэхгүй бол (жишээ
    // system/adminusers эрхтэй, merchant context-гүй дуудлага) салбараас олно.
    const resolvedMerchantId =
      merchant_id ?? existing?.merchant_id ?? (await this.resolveMerchantId(branch_id));

    const id = AppUtils.uuid4();
    await this.dao.add({
      id,
      branch_id,
      approved_by: approvedBy,
      merchant_id: resolvedMerchantId,
      booking_status: ScheduleStatus.Active,
      date: input.date,
      index: weekdayIndex(input.date),
      times,
      start_time,
      end_time,
      finish_time,
      is_generated: false,
      source_booking_id: null,
      is_leave: false,
      leave_description: null,
    } as any);

    return id;
  }

  /** Single-day upsert (хуучин `create()`-тэй ижил гадаад API, шинэ `date` түлхүүртэй). */
  public async create(dto: BookingDto, merchant: string, user: string) {
    if (!dto.date) {
      throw new HttpException('Огноо (date) заавал шаардлагатай.', 400);
    }
    if (!dto.branch_id) {
      throw new HttpException('Салбар (branch_id) заавал шаардлагатай.', 400);
    }

    await this.upsertDay(
      dto.branch_id,
      { date: dto.date, times: dto.times, finish_time: dto.finish_time },
      user,
      merchant,
    );

    await this.dao.deleteGeneratedFrom(dto.branch_id, dto.date);
    this.orderService.invalidateSlotsCache(dto.branch_id);
    await this.ensureAvailabilityWindow();
  }

  /** Салбарт бүтэн долоо хоногийн (эсвэл дурын хэдэн өдрийн) цагийг нэг дор тавина. */
  public async setWeek(
    dto: BookingWeekDto,
    approvedBy: string,
    merchant?: string,
  ) {
    if (!dto.days?.length) {
      throw new HttpException('Дор хаяж нэг өдөр өгнө үү.', 400);
    }

    const sortedDates = [...dto.days].map((d) => d.date).sort();
    for (const day of dto.days) {
      await this.upsertDay(dto.branch_id, day, approvedBy, merchant);
    }

    const lastDate = sortedDates[sortedDates.length - 1];
    await this.dao.deleteGeneratedFrom(dto.branch_id, lastDate);

    this.orderService.invalidateSlotsCache(dto.branch_id);
    return this.ensureAvailabilityWindow();
  }

  /**
   * app_config.availability_days-аар тодорхойлогдсон цонхыг (өнөөдрөөс хойш)
   * салбар бүрийн хувьд бүрэн бөглөгдсөн байлгана (schedule модультой ижил
   * логик — 7 хоногийн өмнөх ижил гарагийн сүүлийн мөрийг хуулна).
   */
  public async ensureAvailabilityWindow(): Promise<{
    branches: number;
    created: number;
  }> {
    const days = await this.dao.getAvailabilityDays();
    const today = toYMD(new Date());
    const targetEnd = addDays(today, days);

    const branches = await this.dao.listDistinctBranches();
    let created = 0;

    for (const branchId of branches) {
      const existingDates = await this.dao.listDatesInRange(
        branchId,
        today,
        targetEnd,
      );

      let cursor = today;
      while (cursor <= targetEnd) {
        if (!existingDates.has(cursor)) {
          const source = await this.dao.findSourceForDate(branchId, cursor);
          if (source) {
            const id = AppUtils.uuid4();
            await this.dao.add({
              id,
              branch_id: branchId,
              approved_by: source.approved_by,
              merchant_id: source.merchant_id,
              booking_status: ScheduleStatus.Active,
              date: cursor,
              index: weekdayIndex(cursor),
              times: source.times,
              start_time: source.start_time,
              end_time: source.end_time,
              finish_time: source.finish_time,
              is_generated: true,
              source_booking_id: source.id,
              is_leave: false,
              leave_description: null,
            } as any);
            created += 1;
          }
        }
        cursor = addDays(cursor, 1);
      }
    }

    this.logger.log(
      `ensureAvailabilityWindow: ${branches.length} branch(es), ${created} row(s) generated (window ${today}..${targetEnd})`,
    );
    return { branches: branches.length, created };
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }
  public async list(filter: BookingListType) {
    return await this.dao.list({
      ...filter,
    });
  }
  /** Тусдаа "Салбарын амралт" хуудасны зориулалттай жагсаалт. */
  public async findLeaves(pg: PaginationDto) {
    return await this.dao.listLeaves(pg as any);
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }
  public async findByBranchId(id: string) {
    return await this.dao.list({
      branch_id: id,
    });
  }

  /** Тухайн салбарын өгөгдсөн долоо хоногийн (7 өдөр) мөрүүдийг буцаана. */
  public async getWeek(branch_id: string, weekStart: string) {
    const weekEnd = addDays(weekStart, 6);
    return await this.dao.list({
      branch_id,
      date_from: weekStart,
      date_to: weekEnd,
      booking_status: ScheduleStatus.Active,
    });
  }

  public async update(id: string, dto: BookingDto) {
    const booking = await this.findOne(id);
    if (!booking) return;
    const range = dto.times === undefined ? {} : slotRangeToTimes(dto.times);
    const nextTimes = dto.times ?? booking.times?.split('|') ?? [];

    if (dto.times !== undefined || dto.finish_time !== undefined) {
      this.normalizeFinishTime(
        nextTimes,
        dto.finish_time === undefined ? booking.finish_time : dto.finish_time,
      );
    }

    const payload: any = { ...dto, ...range, id };
    if (dto.date) {
      payload.index = weekdayIndex(dto.date);
    }
    // Гараар засварласан тул цаашид автоматаар дахин бичигдэхгүй байх ёстой.
    payload.is_generated = false;
    payload.source_booking_id = null;

    if (dto.finish_time !== undefined) {
      payload.finish_time = this.normalizeFinishTime(
        nextTimes,
        dto.finish_time,
      );
    }

    const res = await this.dao.update(payload, getDefinedKeys(payload, true));
    if (booking.date) {
      await this.dao.deleteGeneratedFrom(
        booking.branch_id,
        toYMD(booking.date),
      );
      this.orderService.invalidateSlotsCache(booking.branch_id);
      await this.ensureAvailabilityWindow();
    }
    return res;
  }

  /** Legacy: индекс (0-6) дээр суурилсан бүх мөрийг устгана. */
  public async removeByIndex(branch_id: string, index: number) {
    const bookings = await this.dao.list({
      index,
      branch_id,
    });
    await Promise.all(
      bookings.items.map(async (booking) => {
        await this.dao.deleteBooking(booking.id);
      }),
    );
  }

  /** Тухайн өдрийн цагийг цэвэрлэнэ (мөрийг УСТГАХГҮЙ, зөвхөн цагийг нь хоослоно). */
  public async removeByDate(branch_id: string, date: string) {
    const bookings = await this.dao.list({ date, branch_id });
    const existing = bookings?.items?.[0];

    if (existing) {
      await this.dao.update(
        {
          id: existing.id,
          times: null,
          start_time: null,
          end_time: null,
          finish_time: null,
          is_generated: false,
          source_booking_id: null,
        },
        [
          'times',
          'start_time',
          'end_time',
          'finish_time',
          'is_generated',
          'source_booking_id',
        ],
      );
    } else {
      const merchant_id = await this.resolveMerchantId(branch_id);
      await this.dao.add({
        id: AppUtils.uuid4(),
        branch_id,
        merchant_id,
        approved_by: branch_id,
        booking_status: ScheduleStatus.Active,
        date,
        index: weekdayIndex(date),
        times: null,
        is_generated: false,
        source_booking_id: null,
        is_leave: false,
        leave_description: null,
      } as any);
    }

    this.orderService.invalidateSlotsCache(branch_id);
  }

  /**
   * Салбарт нэг эсвэл хэд хэдэн өдөр амралт (хаалттай өдөр) тавина (хуучин
   * `branch_leaves` API-ийн оронд). Хадгалсан даруйд `ensureAvailabilityWindow`
   * шууд дахин ажиллана — тусад нь "generate" дуудах шаардлагагүй.
   */
  public async setLeave(dto: SetBranchLeaveDto, approvedBy: string) {
    if (!dto.dates?.length) {
      throw new HttpException('Дор хаяж нэг огноо өгнө үү.', 400);
    }

    const results: string[] = [];
    for (const date of dto.dates) {
      const existing = await this.dao.findOne(dto.branch_id, date);
      if (existing) {
        await this.dao.update(
          {
            id: existing.id,
            is_leave: dto.is_leave,
            leave_description: dto.is_leave ? (dto.description ?? null) : null,
          },
          ['is_leave', 'leave_description'],
        );
        results.push(existing.id);
      } else {
        const id = AppUtils.uuid4();
        const merchant_id = await this.resolveMerchantId(dto.branch_id);
        await this.dao.add({
          id,
          branch_id: dto.branch_id,
          merchant_id,
          approved_by: approvedBy,
          booking_status: ScheduleStatus.Active,
          date,
          index: weekdayIndex(date),
          times: null,
          is_generated: false,
          source_booking_id: null,
          is_leave: dto.is_leave,
          leave_description: dto.is_leave ? (dto.description ?? null) : null,
        } as any);
        results.push(id);
      }
    }

    this.orderService.invalidateSlotsCache(dto.branch_id);
    await this.ensureAvailabilityWindow();
    return results;
  }

  public async clearLeave(
    branch_id: string,
    dates: string[],
    approvedBy: string,
  ) {
    return this.setLeave({ branch_id, dates, is_leave: false }, approvedBy);
  }
}
