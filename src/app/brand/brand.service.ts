import { Injectable } from '@nestjs/common';
import { BrandDao } from './brand.dao';
import { BrandDto } from './brand.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { ADMINUSERS, getDefinedKeys, STATUS } from 'src/base/constants';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class BrandService {
  constructor(private readonly dao: BrandDao) {}
  public async create(dto: BrandDto, merchant: string) {
    return await this.dao.add({
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
  public async search(filter: SearchDto, merchant: string) {
    return await this.dao.search({
      ...filter,
      merchant,
      status: STATUS.Active,
    });
  }
  public async update(id: string, dto: BrandDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
