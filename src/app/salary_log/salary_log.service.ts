import { Injectable } from '@nestjs/common';
import { SalaryLogDao } from './salary_log.dao';
import { SalaryLogDto } from './salary_log.dto';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  getDefinedKeys,
  PRODUCT_STATUS,
  SALARY_LOG_STATUS,
  STATUS,
} from 'src/base/constants';
import { AppUtils } from 'src/core/utils/app.utils';

@Injectable()
export class SalaryLogService {
  constructor(private readonly dao: SalaryLogDao) {}
  public async create(dto: SalaryLogDto) {
    return await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      salary_status: SALARY_LOG_STATUS.Pending,
      status: STATUS.Active,
    });
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: SalaryLogDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }

  // cron
  // @Cron(CronExpression.EVERY_30_SECONDS)
  createSalaryLog() {
    // await this.create()
  }
}
