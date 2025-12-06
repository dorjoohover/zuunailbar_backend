import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AvailabilitySlotsDao } from './availability_slots.dao';
import {
  ADMIN,
  CLIENT,
  E_M,
  getDatesBetween,
  getDefinedKeys,
  intersectSlots,
  toYMD,
} from 'src/base/constants';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { AvailabilitySlotDto } from './availability_slots.dto';
import { ScheduleService } from '../schedule/schedule.service';
import { BookingService } from '../booking/booking.service';
import { UserService } from '../user/user.service';
import { OrderService } from '../order/order.service';
import { addDays, isSameDay, startOfDay } from 'date-fns';

@Injectable()
export class AvailabilitySlotsService {
  constructor(
    private dao: AvailabilitySlotsDao,
    private schedule: ScheduleService,
    private booking: BookingService,
    @Inject(forwardRef(() => UserService))
    private user: UserService,
  ) {}
  public orderLimit = 7;
  public async create(dto: AvailabilitySlotDto, user: string) {
    return await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
    });
  }
  public async updateOrderLimit(limit: number) {
    this.orderLimit = limit;
  }
  public async getDates(branch: string, dates: Date[], artist?: string) {
    let schedule: any[] = [];
    if (artist) {
      const res = await this.schedule.findByArtist(artist);
      schedule = res.items ?? [];
    }

    const { items: booking } = await this.booking.findByBranchId(branch);

    const result: Record<number, string[]> = {};
    const datetime: Record<number, string> = {};

    const today = startOfDay(new Date());
    const end = this.orderLimit;

    for (let i = 0; i <= end; i++) {
      const date = addDays(today, i);

      if (dates.some((d) => isSameDay(d, date))) continue;

      let dayIndex = date.getDay() - 1;
      if (dayIndex === -1) dayIndex = 6;

      const key = i > 6 ? dayIndex + 7 : dayIndex;
      datetime[key] = toYMD(date);
      if (!result[key]) result[key] = [];
    }

    const weeks = Math.ceil(end / 7);

    for (let week = 0; week < weeks; week++) {
      if (schedule.length === 0) {
        for (const b of booking) {
          if (!b.times || b.index == null) continue;
          const key = week > 0 ? b.index + 7 * week : b.index;
          if (!datetime[key]) continue;
          const times = b.times.split('|');
          result[key] = times;
        }
      } else {
        for (const b of booking) {
          if (!b.times) continue;
          const bookingTimes = b.times.split('|');

          for (const s of schedule) {
            if (!s.times || s.index == null) continue;
            const key = week > 0 ? s.index + 7 * week : s.index;
            if (!datetime[key]) continue;

            const scheduleTimes = s.times.split('|');
            let times = intersectSlots(scheduleTimes, bookingTimes);

            if (times.length === 0) continue;
            result[key] = times;
          }
        }
      }
    }

    const finalValue: Record<string, string[]> = {};
    for (const dayKey in result) {
      const numericKey = Number(dayKey);
      if (!result[numericKey] || result[numericKey].length === 0) continue;

      const dateStr = datetime[numericKey];
      if (!dateStr) continue;

      finalValue[dateStr] = result[numericKey].map(String);
    }

    return finalValue;
  }

  public async createByArtist(artist: string, dates: Date[]) {
    const branch = await this.user.findOne(artist);
    const res = await this.getDates(branch.branch_id, dates, artist);
    return await Promise.all(
      Object.entries(res).map(async ([key, value]) => {
        const date = key as unknown as Date;
        const slot = await this.dao.list({
          artist_id: artist,
          branch_id: branch.branch_id,
          date: date,
        });
        let payload = {
          id: AppUtils.uuid4(),
          artist_id: artist,
          branch_id: branch.branch_id,
          date: date,
          slots: value,
        } as any;
        if (slot.items.length > 0) {
          payload.id = slot.items[0].id;
          return await this.dao.update(payload, getDefinedKeys(payload));
        }
        return await this.dao.add(payload);
      }),
    );
  }
  public async createByBranch(branch: string, dates: Date[]) {
    const artists = await this.user.findAll(
      {
        branch_id: branch,
        role: E_M,
      },
      ADMIN,
    );
    return await Promise.all(
      artists.items.map(async (artist) => {
        const res = await this.getDates(branch, dates, artist.id);
        console.log(artist.nickname, res);
        return await Promise.all(
          Object.entries(res).map(async ([key, value]) => {
            const date = key as unknown as Date;
            const slot = await this.dao.list({
              artist_id: artist.id,
              branch_id: branch,
              date: date,
            });
            let payload = {
              id: AppUtils.uuid4(),
              artist_id: artist.id,
              branch_id: branch,
              date: date,
              slots: value,
            } as any;
            if (slot.items.length > 0) {
              payload.id = slot.items[0].id;
              return await this.dao.update(payload, getDefinedKeys(payload));
            }
            return await this.dao.add(payload);
          }),
        );
      }),
    );
  }

  public async getById(id: string) {
    return await this.dao.getById(id);
  }
  public async findAll(pg: PaginationDto) {
    return await this.dao.list(applyDefaultStatusFilter(pg, CLIENT));
  }

  public async getParallel(artists: string[]) {
    return await this.dao.getCommonDates(artists);
  }
  public async update(id: string, dto: AvailabilitySlotDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async removeByArtist(artist: string, date?: Date[]) {
    return await this.dao.deleteByArtist(artist, date);
  }
  public async removeByArtistAndSlot(
    artist: string,
    date: string,
    time: string,
  ) {
    return await this.dao.updateByArtistSlot(artist, date, time);
  }
  public async removeByBranch(branch: string, date?: Date[]) {
    return await this.dao.deleteByBranch(branch, date);
  }
}
