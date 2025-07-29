import { Injectable } from '@nestjs/common';
import { BrandDao } from './branch.dao';
import { BrandDto } from './branch.dto';

@Injectable()
export class BrandService {
  constructor(private readonly dao: BrandDao) {}
  public async create(dto: BrandDto) {
    return 'This action adds a new brand';
  }

  findAll() {
    return `This action returns all brand`;
  }

  findOne(id: number) {
    return `This action returns a #${id} brand`;
  }

  update(id: number, dto: BrandDto) {
    return `This action updates a #${id} brand`;
  }

  remove(id: number) {
    return `This action removes a #${id} brand`;
  }
}
