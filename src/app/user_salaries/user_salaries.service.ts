import { Injectable } from '@nestjs/common';
import { UserSalaryDto } from './user_salaries.dto';
import { UserSalariesDao } from './user_salaries.dao';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class UserSalariesService {
  constructor(private dao: UserSalariesDao) {}
  public async create(dto: UserSalaryDto) {
    const us = await this.dao.getByUser(dto.user_id, dto.status);
    if (!us && us.length > 0) {
      const user = us[0];
      if (user.percent == dto.percent)
        return await this.update(user.id, {
          duration: dto.duration,
          date: dto.date,
          percent: dto.percent,
          status: dto.status,
          user_id: dto.user_id,
        });
    }
    const res = await this.dao.add({
      duration: dto.duration,
      id: AppUtils.uuid4(),
      percent: dto.percent,
      status: dto.status ?? STATUS.Active,
      user_id: dto.user_id,
      date: dto.date,
    });
    return res;
  }
  public async findAll(pg: PaginationDto, role: number) {
    if (pg.status)
      return await this.dao.list({
        ...applyDefaultStatusFilter(pg, role),
      });
    return await this.dao.list({
      ...applyDefaultStatusFilter(pg, role),
      status: 0,
    });
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }
  public async findByUser(id: string) {
    const res = await this.dao.getByUser(id, STATUS.Active);
    if (!res || res.length == 0) return null;
    return res[0];
  }

  public async update(id: string, dto: UserSalaryDto) {
    return await this.dao.update({ ...dto, id }, [...getDefinedKeys(dto)]);
  }

  public async updateUserSalaryStatus(id: string, status: number) {
    return await this.dao.updateStatus(id, status);
  }
  public async updateStatus(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
