import { Injectable } from '@nestjs/common';
import { CostDto } from './cost.dto';
import { CostDao } from './cost.dao';
import { Branch } from '../branch/branch.entity';
import { ProductService } from '../product/product.service';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class CostService {
  constructor(
    private readonly dao: CostDao,
    private readonly productService: ProductService,
  ) {}
  public async create(dto: CostDto, branch: Branch) {
    const product = await this.productService.findOne(dto.product_id);
    await this.dao.add({
      ...dto,
      branch_id: branch.id,
      branch_name: branch.name,
      category_id: product.category_id,
      id: AppUtils.uuid4(),
      product_name: product.name,
      status: STATUS.Active,
    });
  }

  public async getById(id: string) {
    return await this.dao.getById(id);
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async update(id: string, dto: CostDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
