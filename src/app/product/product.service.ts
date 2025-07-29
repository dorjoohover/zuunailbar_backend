import { Injectable } from '@nestjs/common';

import { ProductDao } from './product.dao';
import { ProductDto } from './product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly dao: ProductDao) {}
  public async create(dto: ProductDto) {
    return 'This action adds a new product';
  }

  findAll() {
    return `This action returns all product`;
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  update(id: number, dto: ProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
