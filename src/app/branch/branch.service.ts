import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BranchDto } from './branch.dto';
import { BranchDao } from './branch.dao';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, STATUS } from 'src/base/constants';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { BranchServiceService } from '../branch_service/branch_service.service';
import { User } from '../user/user.entity';

@Injectable()
export class BranchService {
  constructor(
    private readonly dao: BranchDao,
    @Inject(forwardRef(() => BranchServiceService))
    private service: BranchServiceService,
  ) {}
  public async create(dto: BranchDto, merchant: string, user: User) {
    const res = await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      merchant_id: merchant,
      user_id: null,
      status: STATUS.Active,
    });
    console.log(res);
    await this.service.updateByService(res, user);
    return res;
  }
  async findOne(id: string) {
    return await this.dao.getById(id);
  }
  async findByMerchant(id: string) {
    return await this.dao.getByMerchant(id);
  }

  public async find(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }
  public async search(filter: SearchDto, merchant: string) {
    return await this.dao.search({
      ...filter,
      merchant,
      status: STATUS.Active,
    });
  }
  public async update(id: string, dto: BranchDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
