import { Injectable } from '@nestjs/common';
import { OrderDetailDao } from './order_detail.dao';
import { OrderDetailDto } from './order_detail.dto';

@Injectable()
export class OrderDetailService {
  constructor(private readonly dao: OrderDetailDao) {}
  public async create(dto: OrderDetailDto) {
    return 'This action adds a new orderDetail';
  }

  findAll() {
    return `This action returns all orderDetail`;
  }

  findOne(id: number) {
    return `This action returns a #${id} orderDetail`;
  }

  update(id: number, dto: OrderDetailDto) {
    return `This action updates a #${id} orderDetail`;
  }

  remove(id: number) {
    return `This action removes a #${id} orderDetail`;
  }
}
