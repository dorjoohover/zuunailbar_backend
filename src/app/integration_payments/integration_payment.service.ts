import { BadRequestException, Injectable } from '@nestjs/common';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  getDefinedKeys,
  mnDate,
  SALARY_LOG_STATUS,
  SalaryLogValue,
  SalaryStatus,
  STATUS,
  ubDateAt00,
  usernameFormatter,
} from 'src/base/constants';
import { AppUtils } from 'src/core/utils/app.utils';
import { ExcelService } from 'src/excel.service';
import { UserService } from '../user/user.service';
import { Response } from 'express';
import { IntegrationPaymentDto } from './integration_payment.dto';
import { IntegrationPaymentDao } from './integration_payment.dao';
import { IntegrationService } from '../integrations/integrations.service';
import { BadRequest } from 'src/common/error';

@Injectable()
export class IntegrationPaymentService {
  constructor(
    private readonly dao: IntegrationPaymentDao,
    private user: UserService,
    private integration: IntegrationService,
    private excel: ExcelService,
  ) {}
  public async create(dto: IntegrationPaymentDto) {
    return this.dao.transaction(async (trx) => {
      const integrationRes = await this.dao.getIntegrationForUpdate(
        trx,
        dto.artist_id,
      );
      if (!integrationRes.rows.length) {
        throw new BadRequest().integrationNotFound;
      }

      const integration = integrationRes.rows[0];
      const integration_id = integration.id;
      const paidRes = await this.dao.getPaidAmount(trx, integration_id);

      const paidAmount = Number(paidRes.rows[0].total);
      const totalAmount = Number(integration.amount);
      const balance = totalAmount - paidAmount;

      if (Number(dto.amount) > balance) {
        BadRequest.integrationAmountExceeded(balance);
      }

      await this.dao.insertPayment(trx, {
        ...dto,
        id: AppUtils.uuid4(),
        integration_id,
      });

      if (Number(dto.amount) === balance) {
        await this.dao.updateIntegrationStatus(
          trx,
          integration_id,
          SALARY_LOG_STATUS.Approved,
        );
      }

      return true;
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

  public async update(id: string, dto: IntegrationPaymentDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
