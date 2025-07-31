import { Injectable } from '@nestjs/common';
import { MerchantDao } from './merchant.dao';
import { MerchantDto } from './merchant.dto';
import { BaseService } from 'src/base/base.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { ADMINUSERS, getDefinedKeys, STATUS } from 'src/base/constants';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@ApiBearerAuth('access-token')
@Injectable()
export class MerchantService extends BaseService {
  constructor(private dao: MerchantDao) {
    super();
  }
  public async create(dto: MerchantDto) {
    return await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      status: STATUS.Active,
    });
  }
  async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async find(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async update(id: string, dto: MerchantDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
