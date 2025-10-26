import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base/base.service';
import { AdminUserDao } from './admin.user.dao';
import { AdminUserDto } from './admin.user.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { AdminUserStatus, saltOrRounds } from 'src/base/constants';
import { Role } from 'src/auth/guards/role/role.enum';
import { LoginDto } from 'src/auth/auth.dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AdminUserService extends BaseService {
  constructor(private dao: AdminUserDao) {
    super();
  }

  public async addAdminUser(dto: AdminUserDto): Promise<void> {
    try {
      let user: any = dto;
      let password = await bcrypt.hash(dto.password, saltOrRounds);
      user.id = AppUtils.uuid4();
      user.password = password;
      user.status = AdminUserStatus.Active;
      user.role = Role.AdminUsers;
      user.birthday = new Date(user.birthday);
      await this.dao.add(user);
    } catch (error) {
      console.log(error);
    }
  }
  async getAdminUserById(filter: any) {
    const res = await this.dao.getById(filter.id);
    return res;
  }
  async getAdminUserByDevice(device: string) {
    const res = await this.dao.getByDevice(device);
    return res;
  }
  findAll() {
    return `This action returns all adminUser`;
  }

  findOne(id: number) {
    return `This action returns a #${id} adminUser`;
  }
  public async findDevice(device: string) {
    return await this.dao.getByDevice(device);
  }

  update(id: number, updateAdminUserDto: AdminUserDto) {
    return `This action updates a #${id} adminUser`;
  }

  remove(id: number) {
    return `This action removes a #${id} adminUser`;
  }

  public async getAdminUser(dto: string) {
    try {
      let mobile = dto.includes('+976') ? dto : `+976${dto}`;
      const user = await this.dao.get(mobile);
      return {
        password: user.password ?? '',
        ...user,
      };
    } catch (error) {
      console.log(error);
    }
  }
}
