import { Injectable } from '@nestjs/common';
import { OrderDto } from './order.dto';
import { OrdersDao } from './order.dao';

@Injectable()
export class OrderService {
  constructor(private readonly dao: OrdersDao) {}
  public async create(dto: OrderDto) {
    return 'This action adds a new order';
  }

  findAll() {
    return `This action returns all order`;
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  update(id: number, dto: OrderDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
