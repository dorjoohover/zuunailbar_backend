import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BookingDao } from './booking.dao';
import { BookingDto, BookingListType } from './booking.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import {
  getDefinedKeys,
  ScheduleStatus,
  toTimeString,
} from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { BadRequest } from 'src/common/error';
import { AvailabilitySlotsService } from '../availability_slots/availability_slots.service';

@Injectable()
export class BookingService {
  constructor(
    private readonly dao: BookingDao,
    @Inject(forwardRef(() => AvailabilitySlotsService))
    private slot: AvailabilitySlotsService,
  ) {}
  public async create(dto: BookingDto, merchant: string, user: string) {
    if (!dto.times || dto.times.length == 0)
      throw new BadRequest().notFound('Цаг');
    const times = dto.times.map((time) => Number(time));
    const start = Math.min(...times);
    const end = Math.max(...times);

    await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      branch_id: dto.branch_id,
      approved_by: user,
      booking_status: ScheduleStatus.Active,
      index: dto.index,
      times: dto.times?.join('|'),
      start_time: toTimeString(start),
      end_time: toTimeString(end),
      merchant_id: merchant,
    });
    this.slot.update({ id: dto.branch_id, isArtist: false });
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
    const times = dto.times ? dto.times?.join('|') : null;
    let start_time = null,
      end_time = null;
    if (dto.times) {
      const times = dto.times.map((time) => Number(time));
      const start = Math.min(...times);
      const end = Math.max(...times);
      start_time = toTimeString(start);
      end_time = toTimeString(end);
    }

    const res = await this.dao.update(
      { ...dto, start_time, end_time, times, id },
      getDefinedKeys({ ...dto, start_time, end_time, times }, true),
    );
    if (dto.branch_id) this.slot.update({ id: dto.branch_id, isArtist: false });
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
    this.slot.update({ id: branch_id, isArtist: false });
  }
}
