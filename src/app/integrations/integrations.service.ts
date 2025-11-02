import { Injectable } from '@nestjs/common';
import { IntegrationDao } from './integrations.dao';
import { IntegrationLogDto, IntegrationDto } from './integrations.dto';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  getDefinedKeys,
  mnDate,
  SALARY_LOG_STATUS,
  SalaryLogValue,
  STATUS,
  ubDateAt00,
  usernameFormatter,
} from 'src/base/constants';
import { AppUtils } from 'src/core/utils/app.utils';
import { ExcelService } from 'src/excel.service';
import { UserService } from '../user/user.service';
import { Response } from 'express';

@Injectable()
export class IntegrationService {
  constructor(
    private readonly dao: IntegrationDao,
    private user: UserService,
    private excel: ExcelService,
  ) {}
  public async create(dto: IntegrationDto) {
    return await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      status: STATUS.Active,
    });
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }
  public async findDate(id: string, date: string) {
    return await this.dao.getByDate(id, date);
  }

  public async report(pg: PaginationDto, role: number, res: Response) {
    const selectCols = [
      'id',
      'user_id',
      'amount',
      'order_status',
      'order_count',
      'created_at',
    ];

    // 1) үндсэн жагсаалт
    const { items } = await this.dao.list(
      applyDefaultStatusFilter(pg, role),
      selectCols.join(','),
    );

    // 2) user/customer-уудыг багцлаад авах (боломжтой бол findManyByIds ашигла)
    const userIds = Array.from(
      new Set(items.map((x) => x.user_id).filter(Boolean)),
    );

    const [usersArr] = await Promise.all([
      Promise.all(userIds.map((id) => this.user.findOne(id))),
    ]);

    const usersMap = new Map(
      usersArr.filter(Boolean).map((u: any) => [u.id, u]),
    );

    // 3) мөрүүдээ бэлдэх
    type Row = {
      artist: string;
      amount: number;
      status: string;
      count: number;
      date: Date | string;
    };

    const rows: Row[] = items.map((it: any) => {
      const u = usersMap.get(it.user_id);

      return {
        artist: usernameFormatter(u) ?? '',
        amount: it.amount,
        count: it.order_count,
        status: SalaryLogValue[it.salary_status],
        date: ubDateAt00(it.created_at),
      };
    });

    // 4) Excel баганууд
    const cols = [
      { header: 'Artist', key: 'artist', width: 24 },
      { header: 'Amount', key: 'amount', width: 16 },
      { header: 'Count', key: 'count', width: 16 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Date', key: 'date', width: 16 },
    ];

    // 5) Excel рүү стримлэж буулгах
    return this.excel.xlsxFromIterable(
      res,
      'salary',
      cols as any,
      rows as any,
      {
        sheetName: 'Salaries',
        moneyKeys: ['amount'],
        dateKeys: ['date'],
      },
    );
  }

  public async update(id: string, dto: IntegrationDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }

  public async updateSalaryLog(dto: IntegrationLogDto) {
    const today = new Date();
    const baseDate = new Date(dto.date);
    const salaryDay = dto.day + 15;

    let lastSalaryDate = new Date(baseDate);
    lastSalaryDate.setDate(salaryDay);

    if (today.getDate() < salaryDay) {
      lastSalaryDate.setMonth(today.getMonth() - 1);
      lastSalaryDate.setFullYear(today.getFullYear());
    } else {
      lastSalaryDate.setMonth(today.getMonth());
      lastSalaryDate.setFullYear(today.getFullYear());
    }
    console.log(lastSalaryDate);

    const salaries = await this.dao.getByDate(
      dto.user_id,
      mnDate(lastSalaryDate),
    );
    console.log(salaries);
    if (salaries.length > 0) {
      const { amount, id, order_count } = salaries[0];
      await this.update(id, {
        amount: +amount + +dto.amount,
        approved_by: dto.approved_by,
        date: dto.date,
        order_count: +order_count + +dto.order_count,
        user_id: dto.user_id,
      });
    } else {
      await this.create({
        amount: +dto.amount,
        approved_by: dto.approved_by,
        date: dto.date,
        order_count: +dto.order_count,
        user_id: dto.user_id,
      });
    }
    console.log(salaries);
  }

  // cron
  // @Cron(CronExpression.EVERY_30_SECONDS)
  createSalaryLog() {
    // await this.create()
  }
}
