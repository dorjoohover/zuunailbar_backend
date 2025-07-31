import { Injectable } from '@nestjs/common';
import { UserDto } from './user.dto';
import { UserDao } from './user.dao';
import { AppUtils } from 'src/core/utils/app.utils';
import {
  ADMIN,
  ADMINUSERS,
  CLIENT,
  EMPLOYEE,
  getDefinedKeys,
  MANAGER,
  saltOrRounds,
  STATUS,
  UserStatus,
} from 'src/base/constants';
import { BadRequest, NoPermissionException } from 'src/common/error';
import { User } from './user.entity';
import { MobileFormat } from 'src/common/formatter';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import * as bcrypt from 'bcrypt';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { RegisterDto } from 'src/auth/auth.dto';
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
      status: STATUS.Active,
      user_status: UserStatus.Active,
      mobile: mobile,
      merchant_id: merchant,
      password: password,
      added_by: user.id,
      branch_id: dto.role === ADMIN ? null : branch,
      birthday: new Date(dto.birthday),
    });
  }
  public async register(dto: RegisterDto, merchant: string) {
    const mobile = MobileFormat(dto.mobile);
    const res = await this.dao.getByMobile(mobile);
    if (res.length != 0) throw new BadRequest().registered;
    await this.dao.add({
      id: AppUtils.uuid4(),
      status: STATUS.Active,
      user_status: UserStatus.Active,
      mobile: mobile,
      merchant_id: merchant,
      added_by: null,
      branch_id: null,
      birthday: null,
      description: null,
      firstname: null,
      lastname: null,
      password: null,
      role: CLIENT,
    });
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: number, dto: UserDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async updateStatus(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
