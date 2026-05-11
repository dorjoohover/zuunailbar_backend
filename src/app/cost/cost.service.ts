import { Injectable } from '@nestjs/common';
import { CostDto } from './cost.dto';
import { CostDao } from './cost.dao';
import { Branch } from '../branch/branch.entity';
import { CostCategoryService } from '../cost_category/cost_category.service';
import { AppUtils } from 'src/core/utils/app.utils';
import { CostStatus, getDefinedKeys, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class CostService {
  constructor(
    private readonly dao: CostDao,
    private readonly costCategoryService: CostCategoryService,
  ) {}
  public async create(dto: CostDto, branch: Branch) {
    const costCategory = await this.costCategoryService.getById(
      dto.cost_category_id,
    );
    const price = dto.price ?? 0;
    const paid = dto.paid_amount ?? 0;
    await this.dao.add({
      ...dto,
      branch_id: branch.id,
      branch_name: branch.name,
      cost_category_id: dto.cost_category_id,
      cost_category_name: costCategory?.name ?? '',
      id: AppUtils.uuid4(),
      cost_status: price - paid != 0 ? CostStatus.Remainder : CostStatus.Paid,
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
    const patch: any = { ...dto, id };
    if (dto.cost_category_id) {
      try {
        const costCategory = await this.costCategoryService.getById(
          dto.cost_category_id,
        );
        patch.cost_category_name = costCategory?.name ?? '';
      } catch (e) {
        // keep going even if name lookup fails
      }
    }
    return await this.dao.update(patch, getDefinedKeys(patch));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
