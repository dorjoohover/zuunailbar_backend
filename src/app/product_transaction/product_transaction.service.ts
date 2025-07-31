import { Injectable } from '@nestjs/common';
import { ProductTransactionDao } from './product_transaction.dao';
import { ProductTransactionDto } from './product_transaction.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, PRODUCT_STATUS, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class ProductTransactionService {
  constructor(private readonly dao: ProductTransactionDao) {}
  public async create(
    dto: ProductTransactionDto,
    branch: string,
    user: string,
  ) {
    await this.dao.add({
      ...dto,
      branch_id: branch,
      id: AppUtils.uuid4(),
      created_by: user,
      status: STATUS.Active,
    });
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: ProductTransactionDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
