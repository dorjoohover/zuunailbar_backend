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

  private buildActiveLog(dto: Partial<UserSalaryDto>, fallback?: any) {
    return {
      duration: dto.duration ?? fallback?.duration,
      id: AppUtils.uuid4(),
      percent: dto.percent ?? fallback?.percent,
      status: dto.status ?? fallback?.status ?? STATUS.Active,
      user_id: dto.user_id ?? fallback?.user_id,
      salary_status: SalaryStatus.ACTIVE,
      updated_at: new Date(),
    };
  }

  private async syncUserSalarySnapshot(data: {
    user_id?: string;
    duration?: number;
    percent?: number;
  }) {
    if (!data.user_id) return;
    await this.user.updateSalaryInfo(data.user_id, data.duration, data.percent);
  }

  public async create(dto: UserSalaryDto) {
    const data = this.buildActiveLog(dto);
    const res = await this.dao.addActiveLog(data);
    await this.syncUserSalarySnapshot(data);
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
    const keys = getDefinedKeys(dto);
    if (keys.length === 1 && keys[0] === 'salary_status') {
      return await this.dao.updateSalaryStatus(id, dto.salary_status);
    }

    const current = await this.dao.getById(id);
    if (!current) return 0;

    const data = this.buildActiveLog(dto, current);
    const res = await this.dao.addActiveLog(data, id);
    await this.syncUserSalarySnapshot(data);
    return res;
  }

  public async updateUserSalaryStatus(id: string, status: number) {
    return await this.dao.updateStatus(id, status);
  }
  public async updateSalaryStatus(id: string, status: SalaryStatus) {
    return await this.dao.updateSalaryStatus(id, status);
  }
  public async updateStatus(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
