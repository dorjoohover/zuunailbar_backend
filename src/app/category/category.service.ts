import { Injectable } from '@nestjs/common';
import { CategoryDao } from './category.dao';
import { CategoryDto } from './category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly dao: CategoryDao) {}
  public async create(dto: CategoryDto) {
    return 'This action adds a new category';
  }

  findAll() {
    return `This action returns all category`;
  }

  findOne(id: number) {
    return `This action returns a #${id} category`;
  }

  update(id: number, dto: CategoryDto) {
    return `This action updates a #${id} category`;
  }

  remove(id: number) {
    return `This action removes a #${id} category`;
  }
}
