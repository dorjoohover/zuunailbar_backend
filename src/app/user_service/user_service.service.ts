import { forwardRef, Inject, Injectable } from '@nestjs/common';
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
    @Inject(forwardRef(() => UserService)) private userService: UserService,
  ) {}
  public async create(dto: UserServiceDto, u: User) {
    try {
      let user: User;
      u.role == EMPLOYEE
        ? (user = u)
        : (user = await this.userService.findOne(dto.user_id));
      let userServices = await this.findAll(
        {
          user_id: dto.user_id,
          limit: -1,
          page: 0,
          skip: 0,
          sort: false,
        },
        CLIENT,
      );
      if (userServices.items.length > 0) await this.deleteByUser(user.id);

      const payload = await Promise.all(
        dto.services.map(async (s) => {
          const service = await this.service.findOne(s);
          return {
            ...dto,
            id: AppUtils.uuid4(),
            branch_id: dto.branch_id ?? user.branch_id,
            user_name: usernameFormatter(user),
            service_name: service.name,
            user_id: user.id,
            service_id: s,
            status: STATUS.Active,
          };
        }),
      );
      await this.dao.addMany(payload);
    } catch (error) {
      console.log(error);
    }
  }

  public async search(services: string, user?: string) {
    return await this.dao.getByServices(services, user);
  }
  public async findForClient(branch_id: string, services: string[]) {
    const { count, items } = await this.dao.list(
      applyDefaultStatusFilter(
        {
          branch_id,
          services: services.join(','),
          skip: 0,
          limit: -1,
          sort: false,
        },
        CLIENT,
      ),
    );
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
    const res = await this.dao.list(applyDefaultStatusFilter(pg, role));

    return res;
  }
  public async findAllUserService(pg: PaginationDto, role: number) {
    const res = await this.dao.groupByUserList(
      applyDefaultStatusFilter(pg, role),
    );

    return res;
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async updateLevel(customer_id: string, level: number) {
    await this.dao.updateLevel(customer_id, level);
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
  public async deleteByUser(id: string) {
    return await this.dao.updateByUser(
      { id, status: STATUS.Hidden, updated_at: mnDate() },
      ['id', 'status', 'updated_at'],
    );
  }
}
