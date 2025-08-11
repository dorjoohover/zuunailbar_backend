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
          schedule_status: ScheduleStatus.Pending,
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
  private normalizeTimes(times: string[]): number[] {
    const flat =
      times.length === 1 &&
      typeof times[0] === 'string' &&
      times[0].includes('|')
        ? times[0].split('|')
        : times;

    const nowHour = mnDate().getHours();

    return Array.from(
      new Set(
        flat
          .map((t) => Number(String(t).trim()))
          .filter(
            (n) => Number.isFinite(n) && n > nowHour, // одоогоос хойшхи цаг л авах
          ),
      ),
    ).sort((a, b) => a - b);
  }
  public async checkSchedule(date: Date, times: string[]) {
    const want = this.normalizeTimes(times);
    const res = await this.dao.getAvailableTimes(date);
    const takenSet = new Set((res?.times ?? []).map(Number));

    const overlap = want.filter((h) => takenSet.has(h));

    return { date: res.date, overlap };
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
