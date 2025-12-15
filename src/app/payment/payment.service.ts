import { Injectable } from '@nestjs/common';
import { PaymentDto } from './payment.dto';
import { PaymentDao } from './payment.dao';
import { OrderService } from '../order/order.service';
import { OrderDetailService } from '../order_detail/order_detail.service';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import {
  getDefinedKeys,
  PAYMENT_STATUS,
  PaymentMethod,
  STATUS,
} from 'src/base/constants';
import { BadRequest } from 'src/common/error';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { ExcelService } from 'src/excel.service';
import { Response } from 'express';
import { QpayService } from '../order/qpay.service';

@Injectable()
export class PaymentService {
  constructor(
    private dao: PaymentDao,
    // private order: OrderService,
    private excel: ExcelService,
    private qpay: QpayService,
    private order_detail: OrderDetailService,
  ) {}
  public async create(dto: PaymentDto, merchant: string) {
    await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      merchant_id: merchant,
      order_id: dto.order_id,
      status: dto.status ?? PAYMENT_STATUS.Pending,
      method: dto.method ?? PaymentMethod.P2P,
      amount: dto.amount ?? 0,
      is_pre_amount: dto.is_pre_amount ?? false,
    });
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async report(pg: PaginationDto, role: number, res: Response) {
    const selectCols = [
      'id',
      'brand_name',
      'category_name',
      'name',
      'quantity',
      'price',
    ];

    // 1) үндсэн жагсаалт
    const { items } = await this.dao.list(
      applyDefaultStatusFilter(pg, role),
      selectCols.join(','),
    );

    // 2) user/customer-уудыг багцлаад авах (боломжтой бол findManyByIds ашигла)

    // 3) мөрүүдээ бэлдэх
    type Row = {
      brand: string;
      category: string;
      name: string;
      quantity: number;
      price: number;
    };

    const rows: Row[] = items.map((it: any) => {
      return {
        name: it.name,
        brand: it.brand_name,
        category: it.category_name,
        price: it.price,
        quantity: it.quantity,
      };
    });

    // 4) Excel баганууд
    const cols = [
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Brand', key: 'brand', width: 16 },
      { header: 'Category', key: 'category', width: 16 },
      { header: 'Price', key: 'price', width: 16 },
      { header: 'Quantity', key: 'quantity', width: 16 },
    ];

    // 5) Excel рүү стримлэж буулгах
    return this.excel.xlsxFromIterable(
      res,
      'product',
      cols as any,
      rows as any,
      {
        sheetName: 'Products',
        moneyKeys: ['price'],
      },
    );
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: PaymentDto) {
    const headers = [];
    try {
      // if (dto.brand_id && dto.brand_id != '') {
      //   dto.brand_name =
      //     (await this.brandService.getById(dto.brand_id))?.name ?? '';
      // } else {
      //   headers.push('brand_id');
      //   headers.push('brand_name');
      //   dto.brand_id = null;
      //   dto.brand_name = null;
      // }
      // if (dto.category_id && dto.category_id != '') {
      //   dto.category_name =
      //     (await this.categoryService.getById(dto.category_id))?.name ?? '';
      // } else {
      //   headers.push('category_id');
      //   headers.push('category_name');
      //   dto.category_id = null;
      //   dto.category_name = null;
      // }
    } catch (error) {}

    return await this.dao.update({ ...dto, id }, [
      ...getDefinedKeys(dto),
      ...headers,
    ]);
  }
  public async updateQuantity(id: string, qty: number) {
    const { quantity } = await this.findOne(id);
    console.log(quantity, 'q');
    if (quantity + qty < 0) new BadRequest().STOCK_INSUFFICIENT;
    const body = {
      id,
      quantity: quantity + qty,
    };
    return await this.dao.update(body, getDefinedKeys(body));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, PAYMENT_STATUS.Cancelled);
  }
}
