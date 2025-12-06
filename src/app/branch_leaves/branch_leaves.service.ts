import { Injectable } from '@nestjs/common';
import { BranchLeaveDto } from './branch_leaves.dto';
import { BranchLeavesDao } from './branch_leaves.dao';
import { getDatesBetween, getDefinedKeys, STATUS } from 'src/base/constants';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { AvailabilitySlotsService } from '../availability_slots/availability_slots.service';

@Injectable()
export class BranchLeavesService {
  constructor(
    private dao: BranchLeavesDao,
    private slots: AvailabilitySlotsService,
  ) {}
  public async create(dto: BranchLeaveDto, user: string) {
    const { dates, ...body } = dto;
    const { items } = await this.dao.list({
      branch_id: dto.branch_id,
    });
    const date = items.map((i) => i?.date);
    await this.slots.removeByBranch(dto.branch_id, date);
    return await Promise.all(
      dates.map(async (date) => {
        const leave = await this.dao.getByDateAndBranch(body.branch_id, date);
        if (leave) return leave.id;
        return await this.dao.add({
          ...body,
          date,
          id: AppUtils.uuid4(),
          created_by: user,
        });
      }),
    );
  }

  public async getById(id: string) {
    return await this.dao.getById(id);
  }
  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async removeByDate(branch: string, user: string, dates?: Date[]) {
    const res = await this.dao.deleteByBranch(branch, dates);
    const { items } = await this.dao.list({
      branch_id: branch,
    });
    const date = items.map((i) => i?.date);
    await this.slots.createByBranch(branch, date);
    return res;
  }
}
