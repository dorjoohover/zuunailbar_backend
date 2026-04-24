import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import {
  getDefinedKeys,
  PaymentType,
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

const paymentTypeLabel = {
  [PaymentType.SALARY]: 'Цалин',
  [PaymentType.ADVANCE]: 'Урьдчилгаа',
};

@Injectable()
export class IntegrationPaymentService {
  constructor(
    private readonly dao: IntegrationPaymentDao,
    private user: UserService,
    private integration: IntegrationService,
    private excel: ExcelService,
  ) {}
  public async create(dto: IntegrationPaymentDto) {
    const amount = Number(dto.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpException('Төлөх дүн буруу байна.', HttpStatus.BAD_REQUEST);
    }

    const id = await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      ...(dto.integration_id ? { integration_id: dto.integration_id } : {}),
      amount,
      paid_at: dto.paid_at ?? new Date(),
      status: STATUS.Active,
    });

    if (!id) {
      throw new HttpException(
        'Шилжүүлэг хадгалахад алдаа гарлаа.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return true;
  }
  public async findAll(pg: PaginationDto, role: number) {
    const query = applyDefaultStatusFilter(
      pg,
      role,
    ) as PaginationDto & { from?: string; to?: string; artist_id?: string };
    const data = await this.dao.list(query);
    const reconciliation = await this.integration.getReconciliation(query);
    return {
      items: data.items,
      count: data.count,
      summary: reconciliation.summary,
      from: reconciliation.from,
      to: reconciliation.to,
    };
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
      'artist_id',
      'amount',
      'type',
      'paid_by',
      'paid_at',
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
      type: string;
      date: Date | string;
    };

    const rows: Row[] = items.map((it: any) => {
      const u = usersMap.get(it.artist_id);

      return {
        artist: usernameFormatter(u) ?? '',
        amount: it.amount,
        type: paymentTypeLabel[it.type] ?? String(it.type ?? ''),
        date: ubDateAt00(it.paid_at),
      };
    });

    // 4) Excel баганууд
    const cols = [
      { header: 'Artist', key: 'artist', width: 24 },
      { header: 'Amount', key: 'amount', width: 16 },
      { header: 'Type', key: 'type', width: 16 },
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
