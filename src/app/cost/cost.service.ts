import { Injectable } from '@nestjs/common';
import { CostDto } from './cost.dto';
import { CostDao } from './cost.dao';
import { Branch } from '../branch/branch.entity';
import { CostCategoryService } from '../cost_category/cost_category.service';
import { AppUtils } from 'src/core/utils/app.utils';
import { CostStatus, getDefinedKeys, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { ExcelService } from 'src/excel.service';
import { Response } from 'express';

@Injectable()
export class CostService {
  constructor(
    private readonly dao: CostDao,
    private readonly costCategoryService: CostCategoryService,
    private readonly excel: ExcelService,
  ) {}
  public async create(dto: CostDto, branch: Branch) {
    const costCategory = await this.costCategoryService.getById(
      dto.cost_category_id,
    );
    const price = dto.price ?? 0;
    // Зардал нь нэг дүнтэй болсон тул бүрэн төлсөнд тооцно.
    await this.dao.add({
      ...dto,
      branch_id: branch.id,
      branch_name: branch.name,
      cost_category_id: dto.cost_category_id,
      cost_category_name: costCategory?.name ?? '',
      id: AppUtils.uuid4(),
      price,
      status: STATUS.Active,
    });
  }

  public async getById(id: string) {
    return await this.dao.getById(id);
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async report(pg: PaginationDto, role: number, res: Response) {
    const { items } = await this.dao.list(applyDefaultStatusFilter(pg, role));

    const rows = items.map((it: any) => ({
      name: it.name ?? '',
      category: it.cost_category_name ?? '',
      branch: it.branch_name ?? '',
      price: it.price ?? 0,
      date: it.date ? new Date(it.date).toISOString().slice(0, 10) : '',
    }));

    const cols = [
      { header: 'Нэр', key: 'name', width: 24 },
      { header: 'Зардлын ангилал', key: 'category', width: 20 },
      { header: 'Салбар', key: 'branch', width: 16 },
      { header: 'Дүн', key: 'price', width: 16 },
      { header: 'Огноо', key: 'date', width: 14 },
    ];

    return this.excel.xlsxFromIterable(res, 'cost', cols as any, rows as any, {
      sheetName: 'Costs',
      moneyKeys: ['price'],
    });
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
