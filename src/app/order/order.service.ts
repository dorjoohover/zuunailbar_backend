import { Injectable } from '@nestjs/common';
import { OrderDto } from './order.dto';
import { OrdersDao } from './order.dao';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { DISCOUNT, getDefinedKeys, STATUS } from 'src/base/constants';
import { AppUtils } from 'src/core/utils/app.utils';

@Injectable()
export class OrderService {
  constructor(private readonly dao: OrdersDao) {}
  public async create(dto: OrderDto, user: string) {
    // zasna

    await this.dao.add({
      ...dto,
      customer_id: user,
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

  public async update(id: string, dto: OrderDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
