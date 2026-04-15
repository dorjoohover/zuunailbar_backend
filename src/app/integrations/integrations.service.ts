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

  private normalizeDate(date: Date | string) {
    return mnDate(date);
  }

  private normalizeSalaryStatus(
    status?: number | string | null,
    fallback = SALARY_LOG_STATUS.Pending,
  ) {
    if (status === undefined || status === null || status === '') {
      return fallback;
    }

    const value = Number(status);
    return Number.isFinite(value) ? value : fallback;
  }

  private normalizeDto(dto: IntegrationDto) {
    return {
      ...dto,
      date: this.normalizeDate(dto.date),
      salary_status: this.normalizeSalaryStatus(dto.salary_status),
    };
  }

  private serializeDate<T extends { date?: Date | string | null }>(
    item: T | null,
  ) {
    if (!item) {
      return item;
    }

    if (!item.date) {
      return item;
    }

    return {
      ...item,
      date: this.normalizeDate(item.date),
    };
  }

  public async create(dto: IntegrationDto) {
    const payload = this.normalizeDto(dto);
    return await this.dao.add({
      ...payload,
      id: AppUtils.uuid4(),
      status: STATUS.Active,
    });
  }

  public async findAll(pg: PaginationDto, role: number) {
    const query = applyDefaultStatusFilter(pg, role) as PaginationDto & {
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
      items: data.items.map((item) => this.serializeDate(item)),
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
    return this.serializeDate(await this.dao.getById(id));
  }
  public async findDate(id: string, date: string) {
    const rows = await this.dao.getByDate(id, date);
    return rows.map((item) => this.serializeDate(item));
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
          salary_amount: Number(row.salary_amount ?? 0),
          order_count: Number(row.order_count ?? 0),
          percent: Number(row.percent ?? 0),
          salary_day: Number(row.salary_day ?? 0),
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
        salary_amount: 0,
        order_count: 0,
        percent: 0,
        salary_day: 0,
      };
      const transferred_amount = transferMap.get(artist_id) ?? 0;

      return {
        artist_id,
        income_amount: income.income_amount,
        salary_amount: income.salary_amount,
        order_count: income.order_count,
        percent: income.percent,
        salary_day: income.salary_day,
        transferred_amount,
        balance_amount: income.salary_amount - transferred_amount,
      };
    });
    const summary = items.reduce(
      (acc, item) => {
        acc.income_amount += item.income_amount;
        acc.salary_amount += item.salary_amount;
        acc.transferred_amount += item.transferred_amount;
        acc.balance_amount += item.balance_amount;
        acc.order_count += item.order_count;
        return acc;
      },
      {
        income_amount: 0,
        salary_amount: 0,
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

  public async reportSummary(pg: PaginationDto, role: number, res: Response) {
    const query = applyDefaultStatusFilter(pg, role) as PaginationDto & {
      from?: string;
      to?: string;
      artist_id?: string;
    };

    const [integrationList, reconciliation] = await Promise.all([
      this.findAll(query, role),
      this.getReconciliation(query),
    ]);

    const salaryMap = new Map<
      string,
      { salary_amount: number; order_count: number }
    >();

    for (const item of integrationList.items ?? []) {
      const current = salaryMap.get(item.artist_id) ?? {
        salary_amount: 0,
        order_count: 0,
      };

      salaryMap.set(item.artist_id, {
        salary_amount: current.salary_amount + Number(item.amount ?? 0),
        order_count: current.order_count + Number(item.order_count ?? 0),
      });
    }

    const reconciliationMap = new Map(
      (reconciliation.items ?? []).map((item) => [item.artist_id, item]),
    );
    const artistIds = Array.from(
      new Set([
        ...salaryMap.keys(),
        ...(reconciliation.items ?? []).map((item) => item.artist_id),
      ]),
    );

    const users = await Promise.all(
      artistIds.map((artistId) => this.user.findOne(artistId)),
    );
    const userMap = new Map(
      users.filter(Boolean).map((user: any) => [user.id, user]),
    );

    type Row = {
      artist: string;
      from: string;
      to: string;
      income_amount: number;
      salary_amount: number;
      order_count: number;
      transferred_amount: number;
      balance_amount: number;
    };

    const rows: Row[] = artistIds
      .map((artistId) => {
        const salary = salaryMap.get(artistId);
        const reconciliationItem = reconciliationMap.get(artistId);
        const user = userMap.get(artistId);

        return {
          artist: user ? usernameFormatter(user) : '',
          from: query.from ?? reconciliation.from ?? integrationList.from ?? '',
          to:
            query.to ??
            reconciliation.to ??
            integrationList.to ??
            query.from ??
            '',
          income_amount: Number(reconciliationItem?.income_amount ?? 0),
          salary_amount: Number(
            reconciliationItem?.salary_amount ?? salary?.salary_amount ?? 0,
          ),
          order_count: Number(
            reconciliationItem?.order_count ?? salary?.order_count ?? 0,
          ),
          transferred_amount: Number(
            reconciliationItem?.transferred_amount ?? 0,
          ),
          balance_amount: Number(reconciliationItem?.balance_amount ?? 0),
        };
      })
      .sort((a, b) => a.artist.localeCompare(b.artist));

    return this.excel.xlsxFromIterable(
      res,
      'salary_summary',
      [
        { header: 'Артист', key: 'artist', width: 24 },
        { header: 'Эхлэх огноо', key: 'from', width: 14 },
        { header: 'Дуусах огноо', key: 'to', width: 14 },
        { header: 'Нийт орлого', key: 'income_amount', width: 16 },
        { header: 'Цалин', key: 'salary_amount', width: 16 },
        { header: 'Захиалгын тоо', key: 'order_count', width: 14 },
        { header: 'Шилжүүлсэн', key: 'transferred_amount', width: 16 },
        { header: 'Үлдэгдэл', key: 'balance_amount', width: 16 },
      ] as any,
      rows as any,
      {
        sheetName: 'Salary Summary',
        moneyKeys: [
          'income_amount',
          'salary_amount',
          'transferred_amount',
          'balance_amount',
        ],
      },
    );
  }

  public async update(id: string, dto: IntegrationDto) {
    const payload = this.normalizeDto(dto);
    return await this.dao.update({ ...payload, id }, getDefinedKeys(payload));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }

  public async updateSalaryLog(dto: IntegrationLogDto) {
    const normalizedDate = this.normalizeDate(dto.date);
    const salary = await this.dao.getByArtistAndDate(
      dto.artist_id,
      normalizedDate,
    );
    const salaryStatus = this.normalizeSalaryStatus(
      dto.salary_status,
      salary?.salary_status ?? SALARY_LOG_STATUS.Pending,
    );

    if (salary) {
      const { amount, id, order_count } = salary;
      await this.update(id, {
        amount: +amount + +dto.amount,
        approved_by: dto.approved_by,
        date: normalizedDate,
        order_count: +order_count + +dto.order_count,
        artist_id: dto.artist_id,
        salary_status: salaryStatus,
      });
    } else {
      await this.create({
        amount: +dto.amount,
        salary_status: salaryStatus,
        approved_by: dto.approved_by,
        date: normalizedDate,
        order_count: +dto.order_count,
        artist_id: dto.artist_id,
      });
    }
  }

  // cron
  // @Cron(CronExpression.EVERY_30_SECONDS)
  createSalaryLog() {
    // await this.create()
  }
}
