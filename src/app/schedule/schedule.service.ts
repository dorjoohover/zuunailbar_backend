import { forwardRef, HttpException, Inject, Injectable } from '@nestjs/common';
import { ScheduleDao } from './schedule.dao';
import { ScheduleDto } from './schedule.dto';
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
} from 'src/base/constants';
import { BadRequest } from 'src/common/error';
import { UserService } from '../user/user.service';
import { ScheduleListType } from './schedule.entity';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly dao: ScheduleDao,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
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
  public async create(dto: ScheduleDto, u: string) {
    if (!dto.times || dto.times.length == 0)
      throw new BadRequest().notFound('Цаг');
    if (!dto.user_id)
      throw new HttpException(
        'Боломжтой сул цагтай артист энэ цагт байхгүй байна',
        400,
      );
    const artist = await this.userService.findOne(dto.user_id);

    if (!artist)
      throw new HttpException(
        'Боломжтой сул цагтай артист энэ цагт байхгүй байна',
        400,
      );
    const { times, start_time, end_time } = slotRangeToTimes(dto.times);
    const finish_time = this.normalizeFinishTime(dto.times, dto.finish_time);
    const meta = {
      mobile: artist.mobile,
      nickname: artist.nickname,
      color: artist.color,
    };
    await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      approved_by: u,
      schedule_status: ScheduleStatus.Active,
      index: dto.index,
      times,
      start_time,
      end_time,
      finish_time,
      user_id: dto.user_id,
      branch_id: artist.branch_id,
      meta,
    });
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

  public async removeByIndex(user_id: string, index: number) {
    const schedules = await this.dao.list({
      index,
      user_id,
    });
    await Promise.all(
      schedules.items.map(async (schedule) => {
        await this.dao.deleteSchedule(schedule.id);
      }),
    );
  }
}
