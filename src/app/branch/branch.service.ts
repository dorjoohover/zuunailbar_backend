import { Injectable } from '@nestjs/common';
import { BranchDto } from './branch.dto';
import { BranchDao } from './branch.dao';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class BranchService {
  constructor(private readonly dao: BranchDao) {}
  public async create(dto: BranchDto, merchant: string) {
    const res = await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      merchant_id: merchant,
      user_id: null,
      status: STATUS.Active,
    });
    return res;
  }
  async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async find(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async update(id: string, dto: BranchDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
