import { Injectable } from '@nestjs/common';
import { ProductTransactionDao } from './product_transaction.dao';
import { ProductTransactionDto } from './product_transaction.dto';

@Injectable()
export class ProductTransactionService {
  constructor(private readonly dao: ProductTransactionDao) {}
  public async create(dto: ProductTransactionDto) {
    return 'This action adds a new productTransaction';
  }

  findAll() {
    return `This action returns all productTransaction`;
  }

  findOne(id: number) {
    return `This action returns a #${id} productTransaction`;
  }

  update(id: number, dto: ProductTransactionDto) {
    return `This action updates a #${id} productTransaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} productTransaction`;
  }
}
