import { HttpException, Injectable } from '@nestjs/common';
import { BookingDao } from './booking.dao';
import { BookingDto, BookingListType } from './booking.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import {
  getDefinedKeys,
  ScheduleStatus,
  slotTimeToDecimal,
  slotRangeToTimes,
  timeToDecimal,
  toTimeString,
} from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { BadRequest } from 'src/common/error';

@Injectable()
export class BookingService {
  constructor(private readonly dao: BookingDao) {}

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
  public async create(dto: BookingDto, merchant: string, user: string) {
    if (!dto.times || dto.times.length == 0)
      throw new BadRequest().notFound('Цаг');
    const { times, start_time, end_time } = slotRangeToTimes(dto.times);
    const finish_time = this.normalizeFinishTime(dto.times, dto.finish_time);

    await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      branch_id: dto.branch_id,
      approved_by: user,
      booking_status: ScheduleStatus.Active,
      index: dto.index,
      times,
      start_time,
      end_time,
      finish_time,
      merchant_id: merchant,
    });
  }
  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }
  public async list(filter: BookingListType) {
    return await this.dao.list({
      ...filter,
    });
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }
  public async findByBranchId(id: string) {
    return await this.dao.list({
      branch_id: id,
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

    const payload = { ...dto, ...range, id };

    if (dto.finish_time !== undefined) {
      payload.finish_time = this.normalizeFinishTime(
        nextTimes,
        dto.finish_time,
      );
    }

    const res = await this.dao.update(
      payload,
      getDefinedKeys(payload, true),
    );
    return res;
  }

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
}
