import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { UserSalaryDto } from './user_salaries.dto';
import { UserSalariesDao } from './user_salaries.dao';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, SalaryStatus, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { UserService } from '../user/user.service';

@Injectable()
export class UserSalariesService {
  constructor(
    private dao: UserSalariesDao,
    @Inject(forwardRef(() => UserService))
    private user: UserService,
  ) {}
  public async create(dto: UserSalaryDto) {
    const us = await this.dao.getByUser(dto.user_id, dto.status);
    if (!us && us.length > 0) {
      const user = us[0];
      return await this.update(user.id, {
        salary_status: SalaryStatus.ACTIVE,
      });
    }
    const res = await this.dao.add({
      duration: dto.duration,
      id: AppUtils.uuid4(),
      percent: dto.percent,
      status: dto.status ?? STATUS.Active,
      user_id: dto.user_id,
      salary_status: dto.salary_status,
    });
    return res;
  }

  public async findAll(pg: PaginationDto, role: number) {
    let data = { count: 0, items: [] };
    if (pg.status)
      data = await this.dao.list({
        ...applyDefaultStatusFilter(pg, role),
      });
    data = await this.dao.list({
      ...applyDefaultStatusFilter(pg, role),
      status: 0,
    });

    if (pg.user_status) {
      data.items = await Promise.all(
        data.items.map(async (item) => {
          const user = await this.user.findOneByStatus(
            item.user_id,
            pg.user_status,
          );
          if (user) return item;
        }),
      );
      data.items = data.items.filter((i) => i);
    }
    return data;
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }
  public async findByUser(id: string) {
    const res = await this.dao.getByUser(id, STATUS.Active);
    if (!res || res.length == 0) return null;
    return res[0];
  }

  public async update(id: string, dto: any) {
    return await this.dao.update({ ...dto, id }, [...getDefinedKeys(dto)]);
  }

  public async updateUserSalaryStatus(id: string, status: number) {
    return await this.dao.updateStatus(id, status);
  }
  public async updateStatus(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
