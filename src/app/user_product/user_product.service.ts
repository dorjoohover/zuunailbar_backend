import { Injectable } from '@nestjs/common';
import { UserProductsDao } from './user_product.dao';
import { UserProductDto } from './user_product.dto';

@Injectable()
export class UserProductService {
  constructor(private readonly dao: UserProductsDao) {}
  public async create(dto: UserProductDto) {
    return 'This action adds a new userProduct';
  }

  findAll() {
    return `This action returns all userProduct`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userProduct`;
  }

  update(id: number, dto: UserProductDto) {
    return `This action updates a #${id} userProduct`;
  }

  remove(id: number) {
    return `This action removes a #${id} userProduct`;
  }
}
