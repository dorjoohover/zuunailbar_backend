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
    // Profit-аас зардлыг (cost + productTx) хасахгүй — зөвхөн цалин хасна.
    const profit = Number(
      dto.profit ?? Math.max(revenue - salary, -1e15),
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
    const [data, costCats, productCats, prevYearRaw] = await Promise.all([
      this.dao.list(filter),
      this.dao.costsByCategory(filter),
      this.dao.productsByCategory(filter),
      this.dao.prevYearSummary(filter),
    ]);

    // Бүтээгдэхүүний ангилал: топ 3 + үлдсэнийг нь "Бусад" болгоно
    const sortedProd = [...productCats].sort((a, b) => b.total - a.total);
    const top3Prod = sortedProd.slice(0, 3);
    const restProdTotal = sortedProd.slice(3).reduce((s, p) => s + p.total, 0);
    if (restProdTotal > 0) {
      top3Prod.push({ category: 'Бусад', total: restProdTotal });
    }

    // Зардлын ангилал бүгдийг + топ 3 бүтээгдэхүүний ангиллыг нэгтгэнэ
    const catMap = new Map<string, number>();
    for (const c of costCats) {
      catMap.set(c.category, (catMap.get(c.category) ?? 0) + c.total);
    }
    for (const p of top3Prod) {
      catMap.set(p.category, (catMap.get(p.category) ?? 0) + p.total);
    }
    const costCategories = Array.from(catMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

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
      prev_year: {
        revenue: Number(prevYearRaw.revenue ?? 0),
        expense: Number(prevYearRaw.expense ?? 0),
        cost_total: Number(prevYearRaw.cost_total ?? 0),
        product_total: Number(prevYearRaw.product_total ?? 0),
        salary: Number(prevYearRaw.salary ?? 0),
        profit: Number(prevYearRaw.profit ?? 0),
      },
      cost_categories: costCategories,
    };
  }
}
