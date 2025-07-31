import { Injectable } from '@nestjs/common';
import { OrderDetailDao } from './order_detail.dao';
import { OrderDetailDto } from './order_detail.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class OrderDetailService {
  constructor(private readonly dao: OrderDetailDao) {}
  public async create(dto: OrderDetailDto) {
    await this.dao.add({
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

  public async update(id: string, dto: OrderDetailDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
