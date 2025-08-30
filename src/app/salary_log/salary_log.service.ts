import { Injectable } from '@nestjs/common';
import { SalaryLogDao } from './salary_log.dao';
import { SalaryLogDto } from './salary_log.dto';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  getDefinedKeys,
  MN_TZ,
  PRODUCT_STATUS,
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
export class SalaryLogService {
  constructor(
    private readonly dao: SalaryLogDao,
    private user: UserService,
    private excel: ExcelService,
  ) {}
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
  public async findDate(id: string, date: string) {
    return await this.dao.getByDate(id, date);
  }

  public async report(pg: PaginationDto, role: number, res: Response) {
    const selectCols = [
      'id',
      'user_id',
      'amount',
      'salary_status',
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
    return this.excel.xlsxFromIterable(res, 'salary', cols as any, rows as any, {
      sheetName: 'Salaries',
      moneyKeys: ['amount'],
      dateKeys: ['date'],
    });
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
