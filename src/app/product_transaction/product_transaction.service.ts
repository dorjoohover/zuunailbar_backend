import { Injectable } from '@nestjs/common';
import { ProductTransactionDao } from './product_transaction.dao';
import { ProductTransactionDto } from './product_transaction.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, mnDate, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { ProductService } from '../product/product.service';
import { Response } from 'express';
import { ExcelService } from 'src/excel.service';

const todayYMD = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

@Injectable()
export class ProductTransactionService {
  constructor(
    private readonly dao: ProductTransactionDao,
    private product: ProductService,
    private excel: ExcelService,
  ) {}

  public async report(pg: PaginationDto, role: number, res: Response) {
    const { items } = await this.dao.listWithDetails(
      applyDefaultStatusFilter({ ...pg, limit: -1, skip: 0 }, role),
    );

    type Row = {
      date: string;
      branch: string;
      product: string;
      category: string;
      quantity: number;
      unit_price: number;
      total_amount: number;
      user: string;
    };

    const rows: Row[] = (items ?? []).map((it: any) => ({
      date: it.date
        ? mnDate(new Date(it.date))
        : mnDate(new Date(it.created_at)),
      branch: it.branch_name ?? '',
      product: it.product_name ?? '',
      category: it.category_name ?? '',
      quantity: Number(it.quantity ?? 0),
      unit_price: Number(it.unit_price ?? 0),
      total_amount: Number(it.total_amount ?? 0),
      user: it.user_name ?? '',
    }));

    const cols = [
      { header: 'Огноо', key: 'date', width: 14 },
      { header: 'Салбар', key: 'branch', width: 24 },
      { header: 'Бүтээгдэхүүн', key: 'product', width: 28 },
      { header: 'Ангилал', key: 'category', width: 18 },
      { header: 'Тоо ширхэг', key: 'quantity', width: 12 },
      { header: 'Нэгж үнэ', key: 'unit_price', width: 14 },
      { header: 'Нийт дүн', key: 'total_amount', width: 14 },
      { header: 'Ажилтан', key: 'user', width: 22 },
    ];

    return this.excel.xlsxFromIterable(
      res,
      'productTransactions',
      cols as any,
      rows as any,
      {
        sheetName: 'Хэрэглээ',
        moneyKeys: ['unit_price', 'total_amount'],
        dateKeys: ['date'],
      },
    );
  }
  public async create(
    dto: ProductTransactionDto,
    branch: string,
    user: string,
  ) {
    await this.product.updateQuantity(dto.product_id, -dto.quantity);
    const unit_price = Number(dto.unit_price ?? 0);
    const quantity = Number(dto.quantity ?? 0);
    const total_amount = Number(
      dto.total_amount ?? (unit_price > 0 ? unit_price * quantity : 0),
    );
    await this.dao.add({
      ...dto,
      branch_id: branch,
      id: AppUtils.uuid4(),
      created_by: user,
      status: STATUS.Active,
      
      price: unit_price,
      total_amount,
      paid_amount: Number(dto.paid_amount ?? 0),
      user_id: dto.user_id || null,
      date: dto.date ?? todayYMD(),
    });
  }

  public async getLastPurchasePrices(productId: string, limit = 3) {
    return await this.dao.lastPurchasePrices(productId, limit);
  }

  public async findAll(pg: PaginationDto, role: number) {
    const filter = applyDefaultStatusFilter(pg, role);
    const base = await this.dao.list(filter);
    if (!base?.items?.length) return base;
    const ids = base.items.map((i: any) => i.id);
    const detailed = await this.dao.listWithDetails({
      ...filter,
      limit: -1,
      skip: 0,
    });
    const map = new Map((detailed.items ?? []).map((d: any) => [d.id, d]));
    const items = base.items.map((it: any) => {
      const d: any = map.get(it.id);
      return {
        ...it,
        branch_name: d?.branch_name ?? '',
        product_name: d?.product_name ?? '',
        category_name: d?.category_name ?? '',
        user_name: d?.user_name?.trim() ?? '',
      };
    });
    void ids;
    return { ...base, items };
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: ProductTransactionDto) {
    const transaction = await this.dao.getById(id);
    const nextProductId = dto.product_id ?? transaction.product_id;
    const nextQuantity =
      dto.quantity !== undefined && dto.quantity !== null
        ? +dto.quantity
        : +transaction.quantity;

    if (nextProductId !== transaction.product_id) {
      await this.product.updateQuantity(
        transaction.product_id,
        +transaction.quantity,
      );
      await this.product.updateQuantity(nextProductId, -nextQuantity);
    } else {
      const diff = +transaction.quantity - nextQuantity;
      if (diff != 0) {
        await this.product.updateQuantity(nextProductId, diff);
      }
    }
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    const transaction = await this.dao.getById(id);
    await this.product.updateQuantity(
      transaction.product_id,
      +transaction.quantity,
    );
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
