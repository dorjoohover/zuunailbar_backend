import { Injectable } from '@nestjs/common';
import { ProductTransactionDao } from './product_transaction.dao';
import { ProductTransactionDto } from './product_transaction.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, PRODUCT_STATUS, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { ProductService } from '../product/product.service';

@Injectable()
export class ProductTransactionService {
  constructor(
    private readonly dao: ProductTransactionDao,
    private product: ProductService,
  ) {}
  public async create(
    dto: ProductTransactionDto,
    branch: string,
    user: string,
  ) {
    await this.product.updateQuantity(dto.product_id, -dto.quantity);
    await this.dao.add({
      ...dto,
      branch_id: branch,
      id: AppUtils.uuid4(),
      created_by: user,
      status: STATUS.Active,
      price: dto.price ?? 0,
      total_amount: dto.total_amount ?? 0,
      user_id: dto.user_id ?? null,
    });
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
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
