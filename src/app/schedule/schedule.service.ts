import { Injectable } from '@nestjs/common';
import { ScheduleDao } from './schedule.dao';
import { ScheduleDto } from './schedule.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { getDefinedKeys, ScheduleStatus, STATUS } from 'src/base/constants';

@Injectable()
export class ScheduleService {
  constructor(private readonly dao: ScheduleDao) {}
  public async create(dto: ScheduleDto, branch: string, user: string) {
    await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      branch_id: branch,
      approved_by: null,
      user_id: user,
      schedule_status: dto.status,
      status: STATUS.Pending, 
      
    });
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
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
