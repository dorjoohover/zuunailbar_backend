import { Injectable } from '@nestjs/common';
import { ServiceDto } from './service.dto';
import { ServiceDao } from './service.dao';
import { AppUtils } from 'src/core/utils/app.utils';
import { BadRequest } from 'src/common/error';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { getDefinedKeys, STATUS } from 'src/base/constants';
import { DiscountService } from '../discount/discount.service';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class ServiceService {
  constructor(
    private readonly dao: ServiceDao,
    private readonly discount: DiscountService,
  ) {}
  public async create(dto: ServiceDto, merchant: string, user: string) {
    BadRequest.branchNotFound(dto.branch_id);
    const res = await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      merchant_id: merchant,
      created_by: user,
      status: STATUS.Active,
    });
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
      let discount;
      let service = item;
      try {
        discount = await this.discount.findByService(item.id);
      } catch (error) {
        discount = undefined;
      }
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

  public async update(id: string, dto: ServiceDto) {
    await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
