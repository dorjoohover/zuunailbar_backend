import { Injectable } from '@nestjs/common';
import { WarehouseDao } from './warehouse.dao';
import { WarehouseDto } from './warehouse.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class WarehouseService {
  constructor(private readonly dao: WarehouseDao) {}
  public async create(dto: WarehouseDto, merchant: string) {
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

  public async update(id: string, dto: WarehouseDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
