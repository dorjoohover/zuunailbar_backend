import { Injectable } from '@nestjs/common';
import { OrderDetailDao } from './order_detail.dao';
import { OrderDetailDto } from './order_detail.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import {
  CLIENT,
  getDefinedKeys,
  OrderStatus,
  STATUS,
} from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { UserService } from '../user/user.service';
import { ExcelService } from 'src/excel.service';
import { Response } from 'express';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  BANK: 'Дансаар',
  CARD: 'Карт',
  CASH: 'Бэлэн',
};

@Injectable()
export class OrderDetailService {
  constructor(
    private readonly dao: OrderDetailDao,
    private user: UserService,
    private readonly excel: ExcelService,
  ) {}
  public async create(dto: OrderDetailDto) {
    return await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      description: dto.description,
    });
  }
  public async createTx(client: any, dto: OrderDetailDto) {
    return await this.dao.create(client, {
      ...dto,
      id: AppUtils.uuid4(),
      description: dto.description,
    });
  }

  async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async find(pg: PaginationDto, role: number) {
    const res = await this.dao.list(applyDefaultStatusFilter(pg, role));
    const items = await Promise.all(
      res.items?.map(async (item) => {
        const user = await this.user.findOne(item.user_id);
        const { password, ...body } = user;
        return {
          ...item,
          user: body,
        };
      }),
    );
    return { items, count: res.count };
  }

  public async findByOrderIds(ids: string[]) {
    return await this.dao.listOrderIds(ids);
  }

  public async findByOrder(order: string) {
    return await this.dao.findByOrder(order);
  }

  public async update(id: string, dto: OrderDetailDto) {
    const { ...body } = dto;
    return await this.dao.update({ ...body, id }, getDefinedKeys(body));
  }
  public async updateTx(client: any, id: string, dto: OrderDetailDto) {
    const { ...body } = dto;
    return await this.dao.updateTx(client, { ...body, id }, getDefinedKeys(body));
  }
  public async updateViewStatusTx(client: any, id: string, status: number) {
    return await this.dao.updateViewStatusTx(client, id, status);
  }
  public async updateStatusByOrder(id: string, status: OrderStatus) {
    return await this.dao.updateStatus(id, status);
  }
  public async remove(id: string) {
    return await this.dao.updateViewStatus(id, STATUS.Hidden);
  }
  public async delete(id: string) {
    return await this.dao.delete(id);
  }
  public async deleteTx(client: any, id: string) {
    return await this.dao.deleteTx(client, id);
  }

  // Артистын цалингийн "Нэгтгэлийн захиалгын задрал" popup дотор шууд Excel
  // татах боломж хэрэгтэй байсан (өмнө нь зөвхөн нэгтгэлийн жагсаалт
  // түвшинд export байсан). Энэ endpoint нь admin-ий тухайн popup-той яг
  // ижил шүүлтүүрээр (user_id, from, to) захиалгын мөр бүрийг татаж, adnin
  // frontend дэх "Нэгтгэлийн захиалгын задрал" хүснэгттэй тохирсон
  // баганатай xlsx үүсгэнэ.
  public async report(
    filter: { user_id?: string; from?: string; to?: string },
    res: Response,
  ) {
    const { items } = await this.dao.list({
      user_id: filter.user_id,
      from: filter.from,
      to: filter.to,
      limit: 5000,
      skip: 0,
      sort: false,
    });

    const rows = (items ?? []).map((item: any) => {
      const parts = [
        item.service_name,
        item.start_time && item.end_time
          ? `${String(item.start_time).slice(0, 5)} - ${String(item.end_time).slice(0, 5)}`
          : undefined,
        item.description,
      ].filter(Boolean);

      return {
        artist_name: item.artist_names ?? '',
        order_date: item.order_date ? new Date(item.order_date) : '',
        detail_info: parts.join(' / '),
        pre_amount: Number(item.pre_amount ?? 0),
        paid_label:
          PAYMENT_TYPE_LABELS[String(item.transaction_type ?? '').toUpperCase()] ??
          'Дансаар',
        paid_amount: Number(item.paid_amount ?? 0),
        total_amount: Number(item.order_total_amount ?? item.price ?? 0),
      };
    });

    return this.excel.xlsxFromIterable(
      res,
      'salary_order_breakdown',
      [
        { header: 'Артист', key: 'artist_name', width: 22 },
        { header: 'Огноо', key: 'order_date', width: 14 },
        { header: 'Захиалгын мэдээлэл', key: 'detail_info', width: 44 },
        { header: 'Урьдчилгаа', key: 'pre_amount', width: 16 },
        { header: 'Төлбөрийн хэлбэр', key: 'paid_label', width: 18 },
        { header: 'Үлдэгдэл төлбөр', key: 'paid_amount', width: 16 },
        { header: 'Дүн', key: 'total_amount', width: 16 },
      ] as any,
      rows as any,
      {
        sheetName: 'Задаргаа',
        dateKeys: ['order_date'],
        moneyKeys: ['pre_amount', 'paid_amount', 'total_amount'],
      },
    );
  }
}
