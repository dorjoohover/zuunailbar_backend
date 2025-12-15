import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BranchDto } from './branch.dto';
import { BranchDao } from './branch.dao';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, STATUS } from 'src/base/constants';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { BranchServiceService } from '../branch_service/branch_service.service';
import { User } from '../user/user.entity';
import { AvailabilitySlotsService } from '../availability_slots/availability_slots.service';
import { UserService } from '../user/user.service';

@Injectable()
export class BranchService {
  constructor(
    private readonly dao: BranchDao,
    @Inject(forwardRef(() => BranchServiceService))
    private service: BranchServiceService,
    @Inject(forwardRef(() => AvailabilitySlotsService))
    private slot: AvailabilitySlotsService,
    @Inject(forwardRef(() => UserService))
    private user: UserService,
  ) {}
  public async create(dto: BranchDto, merchant: string, user: User) {
    const res = await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      merchant_id: merchant,
      user_id: null,
      status: STATUS.Active,
    });
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
    const res = await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
    await this.slot.update({ id, isArtist: false });
    await this.user.updateBranch(id);
    return res;
  }

  public async remove(id: string) {
    const res = await this.dao.updateStatus(id, STATUS.Hidden);
    await this.slot.update({ id, isArtist: false });
    return res;
  }
}
