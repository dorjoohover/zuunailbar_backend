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
import { IntegrationPaymentDao } from '../integration_payments/integration_payment.dao';

@Injectable()
export class IntegrationService {
  constructor(
    private readonly dao: IntegrationDao,
    private readonly integrationPaymentDao: IntegrationPaymentDao,
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
    const query = applyDefaultStatusFilter(
      pg,
      role,
    ) as PaginationDto & {
      from?: string;
      to?: string;
      artist_id?: string;
      salary_status?: string;
    };

    const [data, summaryRow] = await Promise.all([
      this.dao.list(query),
      this.dao.getListSummary(query),
    ]);

    return {
      items: data.items,
      count: data.count,
      from: query.from ?? '',
      to: query.to ?? '',
      summary: {
        total_amount: Number(summaryRow?.total_amount ?? 0),
        total_order_count: Number(summaryRow?.total_order_count ?? 0),
        total_count: Number(summaryRow?.total_count ?? 0),
      },
    };
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }
  public async findDate(id: string, date: string) {
    return await this.dao.getByDate(id, date);
  }
  public async getReconciliation(
    pg: PaginationDto & { from?: string; to?: string; artist_id?: string },
  ) {
    const from = pg.from;
    const to = pg.to;

    const [incomeRows, transferRows] = await Promise.all([
      this.dao.getArtistIncomeTotals({
        from,
        to,
        artist_id: pg.artist_id,
      }),
      this.integrationPaymentDao.getArtistTransferTotals({
        from,
        to,
        artist_id: pg.artist_id,
      }),
    ]);

    const transferMap = new Map(
      transferRows.map((row) => [
        row.artist_id,
        Number(row.transferred_amount ?? 0),
      ]),
    );
    const incomeMap = new Map(
      incomeRows.map((row) => [
        row.artist_id,
        {
          income_amount: Number(row.income_amount ?? 0),
          order_count: Number(row.order_count ?? 0),
        },
      ]),
    );

    const artistIds = new Set([
      ...incomeRows.map((row) => row.artist_id),
      ...transferRows.map((row) => row.artist_id),
    ]);

    const items = [...artistIds].map((artist_id) => {
      const income = incomeMap.get(artist_id) ?? {
        income_amount: 0,
        order_count: 0,
      };
      const transferred_amount = transferMap.get(artist_id) ?? 0;

      return {
        artist_id,
        income_amount: income.income_amount,
        order_count: income.order_count,
        transferred_amount,
        balance_amount: income.income_amount - transferred_amount,
      };
    });
    const summary = items.reduce(
      (acc, item) => {
        acc.income_amount += item.income_amount;
        acc.transferred_amount += item.transferred_amount;
        acc.balance_amount += item.balance_amount;
        acc.order_count += item.order_count;
        return acc;
      },
      {
        income_amount: 0,
        transferred_amount: 0,
        balance_amount: 0,
        order_count: 0,
      },
    );

    return {
      from: from ?? '',
      to: to ?? '',
      count: items.length,
      summary,
      items,
    };
  }

  public async report(pg: PaginationDto, role: number, res: Response) {
    const selectCols = [
      'id',
      'artist_id',
      'amount',
      'salary_status',
      'order_count',
      'date',
    ];

    // 1) үндсэн жагсаалт
    const { items } = await this.dao.list(
      applyDefaultStatusFilter(pg, role),
      selectCols.join(','),
    );

    // 2) user/customer-уудыг багцлаад авах (боломжтой бол findManyByIds ашигла)
    const userIds = Array.from(
      new Set(items.map((x) => x.artist_id).filter(Boolean)),
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
      const u = usersMap.get(it.artist_id);

      return {
        artist: usernameFormatter(u) ?? '',
        amount: it.amount,
        count: it.order_count,
        status: SalaryLogValue[it.salary_status],
        date: ubDateAt00(it.date),
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

    const lastSalaryDate = new Date(baseDate);
    lastSalaryDate.setDate(salaryDay);

    if (today.getDate() < salaryDay) {
      lastSalaryDate.setMonth(today.getMonth() - 1);
      lastSalaryDate.setFullYear(today.getFullYear());
    } else {
      lastSalaryDate.setMonth(today.getMonth());
      lastSalaryDate.setFullYear(today.getFullYear());
    }

    const salaries = await this.dao.getByDate(
      dto.artist_id,
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
        artist_id: dto.artist_id,
        salary_status: dto.salary_status,
      });
    } else {
      await this.create({
        amount: +dto.amount,
        salary_status: dto.salary_status,
        approved_by: dto.approved_by,
        date: dto.date,
        order_count: +dto.order_count,
        artist_id: dto.artist_id,
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
