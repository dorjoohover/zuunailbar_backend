import { Injectable } from '@nestjs/common';
import { DashboardDao, SnapshotFilter } from './dashboard.dao';
import { DashboardSnapshotDto } from './dashboard.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { STATUS } from 'src/base/constants';

@Injectable()
export class DashboardService {
  constructor(private readonly dao: DashboardDao) {}

  public async upsertSnapshot(dto: DashboardSnapshotDto) {
    const revenue = Number(dto.revenue ?? 0);
    const cost_total = Number(dto.cost_total ?? 0);
    const product_total = Number(dto.product_total ?? 0);
    const expense = Number(dto.expense ?? cost_total + product_total);
    const salary = Number(dto.salary ?? 0);
    const profit = Number(
      dto.profit ?? Math.max(revenue - expense - salary, -1e15),
    );
    // Хоосон string ('') UUID-руу очвол PG syntax error өгөх тул null болгох.
    const branch_id =
      dto.branch_id && String(dto.branch_id).trim() !== ''
        ? dto.branch_id
        : null;
    const created_by =
      dto.created_by && String(dto.created_by).trim() !== ''
        ? dto.created_by
        : null;
    if (!dto.date) {
      // Date багана NOT NULL — date байхгүй snapshot хадгалахгүй.
      return null;
    }
    return await this.dao.upsert({
      id: AppUtils.uuid4(),
      date: dto.date,
      branch_id,
      revenue,
      expense,
      cost_total,
      product_total,
      salary,
      profit,
      order_count: Number(dto.order_count ?? 0),
      status: STATUS.Active,
      created_by,
    });
  }

  public async list(filter: SnapshotFilter) {
    const data = await this.dao.list(filter);
    const summary = data.summary ?? {
      revenue: 0,
      expense: 0,
      salary: 0,
      profit: 0,
      order_count: 0,
    };
    const revenue = Number(summary.revenue ?? 0);
    const profit = Number(summary.profit ?? 0);
    const profit_percent =
      revenue > 0 ? Math.round((profit / revenue) * 100 * 10) / 10 : 0;

    return {
      items: data.items ?? [],
      summary: {
        revenue,
        expense: Number(summary.expense ?? 0),
        cost_total: Number(summary.cost_total ?? 0),
        product_total: Number(summary.product_total ?? 0),
        salary: Number(summary.salary ?? 0),
        profit,
        order_count: Number(summary.order_count ?? 0),
        profit_percent,
      },
    };
  }
}
