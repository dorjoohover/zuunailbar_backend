import { Injectable } from '@nestjs/common';
import { ProductLogDao } from './product_log.dao';
import { ProductLogDto } from './product_log.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { ProductService } from '../product/product.service';

@Injectable()
export class ProductLogService {
  constructor(
    private readonly dao: ProductLogDao,
    private readonly product: ProductService,
  ) {}
  public async create(dto: ProductLogDto, merchant: string, user: string) {
    await this.product.updateQuantity(dto.product_id, dto.quantity);
    await this.dao.add({
      ...dto,
      merchant_id: merchant,
      id: AppUtils.uuid4(),
      created_by: user,
      status: STATUS.Active,
      // total_amount: dto.total_amount ?? +dto.price * +dto.quantity,
      total_amount: dto.total_amount ?? 0,
      price: dto.price ?? 0,
      currency: dto.currency ?? 'CNY',
      currency_amount: 500,
    });
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: ProductLogDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
