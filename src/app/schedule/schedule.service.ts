import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ScheduleDao } from './schedule.dao';
import { ScheduleDto } from './schedule.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  getDefinedKeys,
  ScheduleStatus,
  toTimeString,
} from 'src/base/constants';
import { OrderService } from '../order/order.service';
import { BadRequest } from 'src/common/error';
import { UserService } from '../user/user.service';
import { ScheduleListType } from './schedule.entity';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly dao: ScheduleDao,
    private userService: UserService,
    @Inject(forwardRef(() => OrderService))
    private readonly order: OrderService,
  ) {}
  public async create(dto: ScheduleDto, u: string) {
    if (!dto.times || dto.times.length == 0)
      throw new BadRequest().notFound('Цаг');
    if (!dto.user_id) throw new BadRequest().notFound('Артист');
    const artist = await this.userService.findOne(dto.user_id);

    if (!artist) throw new BadRequest().notFound('Артист');
    const times = dto.times.map((time) => Number(time));
    const start = Math.min(...times);
    const end = Math.max(...times);
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
      times: dto.times?.join('|'),
      start_time: toTimeString(start),
      end_time: toTimeString(end),
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

  public async update(id: string, dto: ScheduleDto) {
    const times = dto.times ? dto.times?.join('|') : null;

    let start_time = null,
      end_time = null;
    if (dto.times && times != '') {
      const times = dto.times.map((time) => Number(time));
      const start = Math.min(...times);
      const end = Math.max(...times);
      start_time = toTimeString(start);
      end_time = toTimeString(end);
    }

    return await this.dao.update(
      { ...dto, start_time, end_time, times, id },
      getDefinedKeys({ ...dto, start_time, end_time }, true),
    );
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, ScheduleStatus.Hidden);
  }
  public async removeByIndex(user_id: string, index: number) {
    const schedules = await this.dao.list({
      index,
      user_id,
    });
    console.log(schedules);
    await Promise.all(
      schedules.items.map(async (schedule) => {
        await this.dao.deleteSchedule(schedule.id);
      }),
    );
  }
}
