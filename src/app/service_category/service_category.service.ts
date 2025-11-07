import { Injectable } from '@nestjs/common';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { getDefinedKeys, STATUS } from 'src/base/constants';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { ServiceCategoryDao } from './service_category.dao';
import { ServiceCategoryDto } from './service_category.dto';

@Injectable()
export class ServiceCategoryService {
  constructor(private readonly dao: ServiceCategoryDao) {}
  public async create(dto: ServiceCategoryDto, merchant: string) {
    return await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      merchant_id: merchant,
      status: STATUS.Active,
    });
  }

  public async getById(id: string) {
    try {
      return await this.dao.getById(id);
    } catch (error) {
      return null;
    }
  }
  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }
  public async search(filter: SearchDto, merchant: string) {
    const res = await this.dao.search({
      ...filter,
      merchant,
      status: STATUS.Active,
    });
    return res;
  }
  public async update(id: string, dto: ServiceCategoryDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
