import { Injectable } from '@nestjs/common';
import { CategoryDao } from './category.dao';
import { CategoryDto } from './category.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { getDefinedKeys } from 'src/base/constants';

@Injectable()
export class CategoryService {
  constructor(private readonly dao: CategoryDao) {}
  public async create(dto: CategoryDto, merchant: string) {
    await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      merchant_id: merchant,
    });
  }

  public async getById(id: string) {
    return await this.dao.getById(id);
  }

  public async findAll(pg: PaginationDto, role: number) {
    const { status, ...rest } = pg as any;
    return await this.dao.list(rest);
  }
  public async search(filter: SearchDto, merchant: string) {
    return await this.dao.search({
      ...filter,
      merchant,
    });
  }

  public async update(id: string, dto: CategoryDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.deleteById(id);
  }
}
