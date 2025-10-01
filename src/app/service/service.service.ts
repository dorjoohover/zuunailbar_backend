import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ServiceDto } from './service.dto';
import { ServiceDao } from './service.dao';
import { AppUtils } from 'src/core/utils/app.utils';
import { BadRequest } from 'src/common/error';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { getDefinedKeys, STATUS } from 'src/base/constants';
import { DiscountService } from '../discount/discount.service';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { User } from '../user/user.entity';
import { UserServiceService } from '../user_service/user_service.service';
import { BranchService } from '../branch/branch.service';

@Injectable()
export class ServiceService {
  constructor(
    private readonly dao: ServiceDao,
    private readonly discount: DiscountService,
    private readonly branchService: BranchService,
    @Inject(forwardRef(() => UserServiceService))
    private readonly userService: UserServiceService,
    // private readonly schedule: ScheduleService,
    // private readonly booking: BookingService,
  ) {}
  public async create(dto: ServiceDto, merchant: string, user: User) {
    if (dto.isAll) {
      const branches = await this.branchService.findByMerchant(merchant);
      await Promise.all(
        branches.map(async (branch) => {
          await this.dao.add({
            ...dto,
            id: AppUtils.uuid4(),
            branch_id: branch.id,
            merchant_id: merchant,
            created_by: user.id,
            status: STATUS.Active,
          });
        }),
      );
      return;
    }
    BadRequest.branchNotFound(dto.branch_id, user.role);
    const res = await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),

      merchant_id: merchant,
      created_by: user.id,
      status: STATUS.Active,
    });
    return res;
  }

  public async findAll(pg: PaginationDto, role: number) {
    let res: { count: number; items: any[] } = {
      count: 0,
      items: [],
    };
    const list = await this.dao.list(applyDefaultStatusFilter(pg, role));
    res.count = list.count;
    const items = [];
    for (const item of list.items) {
      let service = item;

      const discount = await this.discount.findByService(item.id);

      if (discount) {
        const value = await this.discount.calculateDiscountedPrice(
          discount.type,
          discount.value,
          item.min_price,
          item.max_price,
        );
        service = {
          ...service,
          ...value,
        };
      }
      items.push(service);
    }
    res.items = items;
    return res;
  }
  public async search(filter: SearchDto, merchant: string) {
    const user = filter.user_id;

    let res = await this.dao.search({
      ...filter,
      merchant,
      status: STATUS.Active,
    });
    if (user) {
      const services = await this.userService.search('', user);
      res = services
        .map((s) => res.find((r) => r.id == s.service_id))
        .filter((d) => d != undefined);
    }
    return res;
  }
  public async findOne(id: string) {
    return await this.dao.getById(id);
  }
  public async findByName(name: string) {
    return await this.dao.findName(name);
  }

  public async update(id: string, dto: ServiceDto) {
    await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
