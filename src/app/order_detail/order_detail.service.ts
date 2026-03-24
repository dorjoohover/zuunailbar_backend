import { Injectable } from '@nestjs/common';
import { OrderDetailDao } from './order_detail.dao';
import { OrderDetailDto } from './order_detail.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import {
  CLIENT,
  getDefinedKeys,
  OrderStatus,
  STATUS,
} from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { UserService } from '../user/user.service';

@Injectable()
export class OrderDetailService {
  constructor(
    private readonly dao: OrderDetailDao,
    private user: UserService,
  ) {}
  public async create(dto: OrderDetailDto) {
    return await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      description: dto.description,
    });
  }

  async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async find(pg: PaginationDto, role: number) {
    const res = await this.dao.list(applyDefaultStatusFilter(pg, role));
    const items = await Promise.all(
      res.items?.map(async (item) => {
        const user = await this.user.findOne(item.user_id);
        const { password, ...body } = user;
        return {
          ...item,
          user: body,
        };
      }),
    );
    return { items, count: res.count };
  }

  public async findByOrderIds(ids: string[]) {
    return await this.dao.listOrderIds(ids);
  }

  public async findByOrder(order: string) {
    return await this.dao.findByOrder(order);
  }

  public async update(id: string, dto: OrderDetailDto) {
    const { ...body } = dto;
    return await this.dao.update({ ...body, id }, getDefinedKeys(body));
  }
  public async updateStatusByOrder(id: string, status: OrderStatus) {
    return await this.dao.updateStatus(id, status);
  }
  public async remove(id: string) {
    return await this.dao.updateViewStatus(id, STATUS.Hidden);
  }
  public async delete(id: string) {
    return await this.dao.delete(id);
  }
}
