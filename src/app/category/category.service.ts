import { Injectable } from '@nestjs/common';
import { CategoryDao } from './category.dao';
import { CategoryDto } from './category.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { ADMIN, ADMINUSERS, getDefinedKeys, STATUS } from 'src/base/constants';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class CategoryService {
  constructor(private readonly dao: CategoryDao) {}
  public async create(dto: CategoryDto, merchant: string) {
    await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      merchant_id: merchant,
      status: STATUS.Active,
    });
  }

  public async getById(id: string) {
    return await this.dao.getById(id);
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async update(id: string, dto: CategoryDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
