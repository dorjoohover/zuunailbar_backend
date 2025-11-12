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
import { ServiceCategoryService } from '../service_category/service_category.service';
import { BranchServiceService } from '../branch_service/branch_service.service';

@Injectable()
export class ServiceService {
  constructor(
    private readonly dao: ServiceDao,
    private readonly discount: DiscountService,
    private readonly branchService: BranchService,
    @Inject(forwardRef(() => BranchServiceService))
    private readonly branchServiceService: BranchServiceService,
    private readonly categoryService: ServiceCategoryService,
    @Inject(forwardRef(() => UserServiceService))
    private readonly userService: UserServiceService,
  ) {}
  public async create(dto: ServiceDto, merchant: string, user: User) {
    const branches = await this.branchService.findByMerchant(merchant);
    const category = await this.categoryService.getById(dto.category_id);
    const meta = {
      name: category?.name,
    };
    console.log(dto);
    const res = await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      meta,
      created_by: user.id,
      merchant_id: merchant,
      status: STATUS.Active,
    });
    await Promise.all(
      branches.map(async (branch) => {
        await this.branchServiceService.create(
          {
            branch_id: branch.id,
            created_by: user.id,
            duration: dto.duration,
            max_price: dto.max_price,
            min_price: dto.min_price,
            pre: dto.pre,
            service_id: res,
          },
          user,
        );
      }),
    );
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

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }
  public async findByName(name: string) {
    return await this.dao.findName(name);
  }

  public async update(id: string, dto: ServiceDto, merchant: string) {
    const { ...body } = dto;

    await this.dao.update(
      {
        ...body,
        id,
        view: body.view == 0 ? null : body.view,
      },
      getDefinedKeys(body),
    );
    const branches = await this.branchService.findByMerchant(merchant);
    const service = await this.dao.getById(id);
    if (!service) throw new BadRequest().notFound('Үйлчилгээ');
    let category = null;
    if (dto.category_id) {
      const res = await this.categoryService.getById(dto.category_id);
      if (!res) throw new BadRequest().notFound('Ангилал');
    }
    await Promise.all(
      branches.map(async (branch) => {
        await this.branchServiceService.updateByServiceAndBranch({
          meta: {
            parallel: service.parallel,
            serviceName: service.name,
            description: service.description ?? '',
            categoryName: service.meta?.name,
            branchName: '',
          },
          index: service.index,
          branch_id: branch.id,
          service_id: id,
          min_price: service.min_price,
          max_price: service.max_price,
          pre: service.pre,
          duration: service.duration,
        });
      }),
    );
  }

  public async remove(id: string) {
    await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
