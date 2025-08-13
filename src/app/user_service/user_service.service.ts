import { Injectable } from '@nestjs/common';
import { UserServiceDao } from './user_service.dao';
import { UserServiceDto } from './user_service.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { ServiceService } from '../service/service.service';
import { UserService } from '../user/user.service';
import {
  CLIENT,
  EMPLOYEE,
  getDefinedKeys,
  mnDate,
  STATUS,
  usernameFormatter,
} from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { User } from '../user/user.entity';

@Injectable()
export class UserServiceService {
  constructor(
    private readonly dao: UserServiceDao,
    private service: ServiceService,
    private userService: UserService,
  ) {}
  public async create(dto: UserServiceDto, u: User) {
    let user: User;
    u.role == EMPLOYEE
      ? (user = u)
      : (user = await this.userService.findOne(dto.user_id));
    const service = await this.service.findOne(dto.service_id);
    await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      branch_id: dto.branch_id ?? user.branch_id,
      user_name: usernameFormatter(user),
      service_name: service.name,
      user_id: user.id,
      status: STATUS.Active,
    });
  }
  public async findForClient(pg: PaginationDto) {
    const { count, items } = await this.dao.list(
      applyDefaultStatusFilter(pg, CLIENT),
    );
    console.log(items);
    const res = await Promise.all(
      items.map(async (item) => {
        const user = await this.userService.findOne(item.user_id);
        return {
          ...item,
          user,
        };
      }),
    );
    return {
      count,
      items: res,
    };
  }
  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: UserServiceDto) {
    return await this.dao.update({ ...dto, id, updated_at: mnDate() }, [
      ...getDefinedKeys(dto),
      'updated_at',
    ]);
  }

  public async updateStatus(id: string, status: number) {
    return await this.dao.update({ id, status, updated_at: mnDate() }, [
      'id',
      'status',
      'updated_at',
    ]);
  }
}
