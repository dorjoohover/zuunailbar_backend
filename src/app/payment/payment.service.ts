import { Injectable } from '@nestjs/common';
import { PaymentDto } from './payment.dto';
import { PaymentDao } from './payment.dao';
import { OrderService } from '../order/order.service';
import { OrderDetailService } from '../order_detail/order_detail.service';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import {
  getDefinedKeys,
  mnDate,
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
      paid_at: dto.paid_at,
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
  public async findByInvoiceId(invoiceId: string) {
    return await this.dao.getByInvoiceId(invoiceId);
  }
  public async findByOrder(order_id) {
    return await this.dao.getByOrder(order_id);
  }
  public async listByOrder(order_id: string) {
    return await this.dao.listByOrder(order_id);
  }
  private async syncManualPayment(input: {
    merchant?: string;
    order_id: string;
    created_by?: string;
    method?: PaymentMethod;
    amount: number;
    is_pre_amount: boolean;
    existing?: any;
  }) {
    const {
      merchant,
      order_id,
      created_by,
      method,
      amount,
      is_pre_amount,
      existing,
    } = input;

    if (amount <= 0) {
      if (existing) {
        await this.dao.update(
          {
            id: existing.id,
            status: PAYMENT_STATUS.Cancelled,
          },
          ['status'],
        );
      }
      return null;
    }

    const paidAt = existing?.paid_at ?? new Date();
    const payload = {
      amount,
      created_by,
      is_pre_amount,
      method: method ?? existing?.method ?? PaymentMethod.CASH,
      order_id,
      paid_at: paidAt,
      status: PAYMENT_STATUS.Active,
    };

    if (existing) {
      await this.dao.update(
        {
          id: existing.id,
          ...payload,
        },
        getDefinedKeys(payload),
      );

      return {
        ...existing,
        ...payload,
      };
    }

    if (!merchant) return null;

    await this.create(payload, merchant);
    const payments = await this.dao.listByOrder(order_id);
    return payments.find(
      (payment) =>
        payment.is_pre_amount === is_pre_amount &&
        !payment.invoice_id &&
        payment.status !== PAYMENT_STATUS.Cancelled,
    );
  }
  public async syncManualPayments(input: {
    merchant?: string;
    order_id: string;
    created_by?: string;
    method?: PaymentMethod;
    pre_amount?: number;
    paid_amount?: number;
  }) {
    const payments = await this.dao.listByOrder(input.order_id);
    const manualPayments = payments.filter(
      (payment) => !payment.invoice_id && !payment.payment_id,
    );
    const existingPre = manualPayments.find((payment) => payment.is_pre_amount);
    const existingPaid = manualPayments.find(
      (payment) => payment.is_pre_amount === false,
    );

    const prePayment = await this.syncManualPayment({
      ...input,
      amount: Number(input.pre_amount ?? 0),
      is_pre_amount: true,
      existing: existingPre,
    });
    const paidPayment = await this.syncManualPayment({
      ...input,
      amount: Number(input.paid_amount ?? 0),
      is_pre_amount: false,
      existing: existingPaid,
    });

    const activePayments = [prePayment, paidPayment].filter(Boolean);
    const latestPayment = activePayments.sort(
      (a, b) =>
        new Date(b?.paid_at ?? 0).getTime() - new Date(a?.paid_at ?? 0).getTime(),
    )[0];

    return {
      latestPaidAt: latestPayment?.paid_at,
      latestMethod: latestPayment?.method,
      hasPrePayment: Number(input.pre_amount ?? 0) > 0,
    };
  }
  public async markInvoicePaid(input: {
    invoice_id: string;
    paid_at?: Date;
    payment_id?: string;
  }) {
    const payment = await this.dao.getByInvoiceId(input.invoice_id);
    if (!payment) return null;

    const paid_at = input.paid_at ?? new Date();
    const payload = {
      status: PAYMENT_STATUS.Active,
      paid_at,
      payment_id: input.payment_id ?? payment.payment_id,
    };

    await this.dao.update(
      {
        id: payment.id,
        ...payload,
      },
      getDefinedKeys(payload),
    );

    return {
      ...payment,
      ...payload,
    };
  }
  public async getDailySummary(
    pg: PaginationDto & { from?: string; to?: string },
    merchantId: string,
  ) {
    const from = pg.from ?? mnDate(new Date());
    const to = pg.to ?? from;
    const result = await this.dao.getDailySummary({
      merchant_id: merchantId,
      from,
      to,
    });

    const pre_amount = Number(result?.pre_amount ?? 0);
    const cash_amount = Number(result?.cash_amount ?? 0);
    const bank_amount = Number(result?.bank_amount ?? 0);

    return {
      from,
      to,
      pre_amount,
      cash_amount,
      bank_amount,
      total_amount: pre_amount + cash_amount + bank_amount,
    };
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
