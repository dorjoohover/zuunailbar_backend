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
  OrderSlot,
  ParallelOrderSlot,
  STATUS,
  toYMD,
  usernameFormatter,
} from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { User } from '../user/user.entity';

@Injectable()
export class UserServiceService {
  constructor(
    private readonly dao: UserServiceDao,
    @Inject(forwardRef(() => ServiceService))
    private readonly service: ServiceService,
    @Inject(forwardRef(() => UserService)) private userService: UserService,
  ) {}
  public async create(dto: UserServiceDto, u: User) {
    try {
      let services = dto.services;
      let user: User;
      u.role == EMPLOYEE
        ? (user = u)
        : (user = await this.userService.findOne(dto.user_id));
      const userServices = await this.findAll(
        {
          user_id: dto.user_id,
          limit: -1,
          page: 0,
          skip: 0,
          sort: false,
        },
        CLIENT,
      );
      if (userServices.items.length > 0) {
        const dtoServices = dto.services;

        const toDelete = userServices.items
          .filter((s) => !dtoServices.includes(s.service_id))
          .map((s) => s.id);
        if (toDelete.length > 0) await this.dao.deleteMany(toDelete);
        services = dtoServices.filter(
          (id) => !userServices.items.some((s) => s.service_id === id),
        );
      }
      const payload = await Promise.all(
        services.map(async (s) => {
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

  public async getDurationOfServices(id: string[]) {
    return await this.service.getDurationOfServices(id);
  }
  public async getByServices(input: {
    services: string[];
    user?: string;
    parallel: boolean;
    branch_id: string;
  }) {
    const { services, parallel, branch_id } = input;
    if (parallel || services.length == 1) {
      return await this.dao.getByServices({ services, branch_id });
    } else {
      return await this.dao.getByServicesAll({ services, branch_id });
    }
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

  // public async updateLevel(customer_id: string, level: number) {
  //   await this.dao.updateLevel(customer_id, level);
  // }

  public async update(id: string, dto: UserServiceDto) {
    return await this.dao.update({ ...dto, id, updated_at: mnDate() }, [
      ...getDefinedKeys(dto),
      'updated_at',
    ]);
  }

  public async updateStatus(id: string, status: number) {
    return await this.dao.update({ id, status }, ['id', 'status']);
  }
  public async deleteByUser(id: string) {
    return await this.dao.updateByUser({ user_id: id, status: STATUS.Hidden }, [
      'user_id',
      'status',
    ]);
  }

  private async getServiceArtists(input: any) {
    const { services, branch_id, order_date, start_time } = input;

    const mapping: Record<string, string[]> = {};
    for (const service of services) {
      const { items } = await this.dao.list({
        branch_id,
        service_id: service,
      });

      const availableArtists: string[] = [];

      for (const item of items) {
        const orders = await this.dao.checkUsersOrder(
          item.user_id,
          order_date,
          start_time,
        );

        const isBusy = orders.length > 0;

        if (!isBusy) {
          availableArtists.push(item.user_id);
        }
      }

      mapping[service] = availableArtists;
    }

    return mapping;
  }

  public async etParallelArtists(input: any) {
    const mapping = await this.getServiceArtists(input);
    return mapping;
  }
}
