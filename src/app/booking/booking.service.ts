import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BookingDao } from './booking.dao';
import { BookingDto, BookingListType } from './booking.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import {
  getDefinedKeys,
  ScheduleStatus,
  slotRangeToTimes,
} from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { BadRequest } from 'src/common/error';

@Injectable()
export class BookingService {
  constructor(private readonly dao: BookingDao) {}
  public async create(dto: BookingDto, merchant: string, user: string) {
    if (!dto.times || dto.times.length == 0)
      throw new BadRequest().notFound('Цаг');
    const { times, start_time, end_time } = slotRangeToTimes(dto.times);

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
    const range = dto.times === undefined ? {} : slotRangeToTimes(dto.times);
    const payload = { ...dto, ...range, id };

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
