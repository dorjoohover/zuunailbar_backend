import { Injectable } from '@nestjs/common';
import { ProductLogDao } from './product_log.dao';
import { ProductLogDto } from './product_log.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, PRODUCT_LOG_STATUS, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { ProductService } from '../product/product.service';

@Injectable()
export class ProductLogService {
  constructor(
    private readonly dao: ProductLogDao,
    private readonly product: ProductService,
  ) {}

  private getPaymentStatus(totalAmount: number, paidAmount: number) {
    return totalAmount - paidAmount <= 0
      ? PRODUCT_LOG_STATUS.Bought
      : PRODUCT_LOG_STATUS.Remainder;
  }

  public async create(dto: ProductLogDto, merchant: string, user: string) {
    await this.product.updateQuantity(dto.product_id, dto.quantity);
    const total_amount = dto.total_amount ?? 0;
    const paid_amount = dto.paid_amount ?? 0;
    await this.dao.add({
      ...dto,
      merchant_id: merchant,
      id: AppUtils.uuid4(),
      created_by: user,
      status: STATUS.Active,
      unit_price: dto.unit_price ?? 0,
      cargo: dto.cargo ?? 0,
      total_amount: total_amount,
      paid_amount: paid_amount,
      product_log_status: this.getPaymentStatus(total_amount, paid_amount),
      price: dto.price ?? 0,
      currency: dto.currency ?? 'CNY',
      currency_amount: dto.currency_amount ?? 500,
    });
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: ProductLogDto) {
    const productLog = await this.dao.getById(id);
    const nextProductId = dto.product_id ?? productLog.product_id;
    const nextQuantity =
      dto.quantity !== undefined && dto.quantity !== null
        ? +dto.quantity
        : +productLog.quantity;

    if (nextProductId !== productLog.product_id) {
      await this.product.updateQuantity(
        productLog.product_id,
        -+productLog.quantity,
      );
      await this.product.updateQuantity(nextProductId, nextQuantity);
    } else {
      const diff = nextQuantity - +productLog.quantity;
      if (diff != 0) {
        await this.product.updateQuantity(nextProductId, diff);
      }
    }

    const total_amount = +(dto.total_amount ?? productLog.total_amount ?? 0);
    const paid_amount = +(dto.paid_amount ?? productLog.paid_amount ?? 0);
    const payload = {
      ...dto,
      id,
      product_log_status:
        dto.product_log_status ??
        this.getPaymentStatus(total_amount, paid_amount),
    };
    return await this.dao.update(payload, getDefinedKeys(payload));
  }

  public async remove(id: string) {
    const productLog = await this.dao.getById(id);
    await this.product.updateQuantity(
      productLog.product_id,
      -+productLog.quantity,
    );
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
