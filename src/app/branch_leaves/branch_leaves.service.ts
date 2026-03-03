import { Injectable } from '@nestjs/common';
import { BranchLeaveDto } from './branch_leaves.dto';
import { BranchLeavesDao } from './branch_leaves.dao';
import {
  CLIENT,
  getDatesBetween,
  getDefinedKeys,
  STATUS,
  usernameFormatter,
} from 'src/base/constants';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { AppUtils } from 'src/core/utils/app.utils';

@Injectable()
export class BranchLeavesService {
  constructor(private dao: BranchLeavesDao) {}
  public async create(dto: BranchLeaveDto, user: string) {
    const { dates, ...body } = dto;
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
    const result = await this.dao.list(applyDefaultStatusFilter(pg, role));
    let results = { count: result.count, items: [] };
    for (const item of result.items) {
      const user = await this.dao.getUser(item.created_by);
      results.items.push({ ...item, creater_name: usernameFormatter(user) });
    }
    return results;
  }

  public async removeByDate(branch: string, user: string, dates?: Date[]) {
    const res = await this.dao.deleteByBranch(branch, dates);
    return res;
  }
}
