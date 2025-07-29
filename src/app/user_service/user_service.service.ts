import { Injectable } from '@nestjs/common';
import { UserServiceDao } from './user_service.dao';
import { UserServiceDto } from './user_service.dto';

@Injectable()
export class UserServiceService {
  constructor(private readonly dao: UserServiceDao) {}
  public async create(dto: UserServiceDto) {
    return 'This action adds a new userService';
  }

  findAll() {
    return `This action returns all userService`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userService`;
  }

  update(id: number, dto: UserServiceDto) {
    return `This action updates a #${id} userService`;
  }

  remove(id: number) {
    return `This action removes a #${id} userService`;
  }
}
