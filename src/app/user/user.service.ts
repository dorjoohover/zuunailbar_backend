import { Injectable } from '@nestjs/common';
import { UserDto } from './user.dto';
import { UserDao } from './user.dao';
import { AppUtils } from 'src/core/utils/app.utils';
import {
  ADMIN,
  EMPLOYEE,
  MANAGER,
  saltOrRounds,
  UserStatus,
} from 'src/base/constants';
import { BadRequest, NoPermissionException } from 'src/common/error';
import { User } from './user.entity';
import { MobileFormat } from 'src/common/formatter';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UserService {
  constructor(private readonly dao: UserDao) {}
  public async create(
    dto: UserDto,
    merchant: string,
    user: User,
    branch: string,
  ) {
    if (dto.role < EMPLOYEE && user.role === MANAGER)
      throw new NoPermissionException();
    if (!dto.password) BadRequest.required('Password');
    const mobile = MobileFormat(dto.mobile);
    const res = await this.dao.getByMobile(mobile);
    if (res.length != 0) throw new BadRequest().registered;
    const password = await bcrypt.hash(dto.password, saltOrRounds);
    await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      status: UserStatus.Active,
      mobile: mobile,
      merchant_id: merchant,
      password: password,
      added_by: user.id,
      branch_id: dto.role === ADMIN ? null : branch,
      birthday: new Date(dto.birthday),
    });
  }

  public async findAll(pg: PaginationDto) {
    return await this.dao.list(pg);
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, dto: UserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
