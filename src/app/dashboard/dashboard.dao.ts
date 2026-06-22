import { Injectable } from '@nestjs/common';
import { AppDB } from 'src/core/db/pg/app.db';
import { DashboardSnapshot } from './dashboard.entity';

const tableName = 'dashboard_snapshots';

export type SnapshotFilter = {
  start_date?: string;
  end_date?: string;
  branch_id?: string;
  status?: number;
};

@Injectable()
export class DashboardDao {
  constructor(private readonly _db: AppDB) {}

  async upsert(data: DashboardSnapshot) {
    const sql = `
      INSERT INTO "${tableName}"
        (id, date, branch_id, revenue, expense, cost_total, product_total, salary, profit, order_count, status, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (date, (COALESCE(branch_id::text, '')))
      DO UPDATE SET
        revenue = EXCLUDED.revenue,
        expense = EXCLUDED.expense,
        cost_total = EXCLUDED.cost_total,
        product_total = EXCLUDED.product_total,
        salary = EXCLUDED.salary,
        profit = EXCLUDED.profit,
        order_count = EXCLUDED.order_count,
        status = EXCLUDED.status,
        created_by = COALESCE(EXCLUDED.created_by, "${tableName}".created_by),
        updated_at = NOW()
      RETURNING *;
    `;
    return await this._db.select(sql, [
      data.id,
      data.date,
      data.branch_id,
      data.revenue,
      data.expense,
      data.cost_total ?? 0,
      data.product_total ?? 0,
      data.salary,
      data.profit,
      data.order_count,
      data.status ?? 10,
      data.created_by ?? null,
    ]);
  }

  private buildConditions(filter: SnapshotFilter) {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filter.status != null) {
      values.push(filter.status);
      conditions.push(`status = $${values.length}`);
    } else {
      conditions.push(`status = 10`);
    }
    if (filter.branch_id) {
      values.push(filter.branch_id);
      conditions.push(`branch_id = $${values.length}`);
    }
    if (filter.start_date) {
      values.push(filter.start_date);
      conditions.push(`date >= $${values.length}`);
    }
    if (filter.end_date) {
      values.push(filter.end_date);
      conditions.push(`date <= $${values.length}`);
    }
    return { conditions, values };
  }

  async list(filter: SnapshotFilter) {
    const { conditions, values } = this.buildConditions(filter);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const itemsSql = `SELECT * FROM "${tableName}" ${where} ORDER BY date ASC`;
    const items = await this._db.select(itemsSql, values);

    const summarySql = `
      SELECT
        COALESCE(SUM(revenue), 0)::numeric AS revenue,
        COALESCE(SUM(expense), 0)::numeric AS expense,
        COALESCE(SUM(cost_total), 0)::numeric AS cost_total,
        COALESCE(SUM(product_total), 0)::numeric AS product_total,
        COALESCE(SUM(salary), 0)::numeric AS salary,
        COALESCE(SUM(profit), 0)::numeric AS profit,
        COALESCE(SUM(order_count), 0)::int AS order_count
      FROM "${tableName}" ${where}
    `;
    const summaryRows = await this._db.select(summarySql, values);
    const summary = summaryRows?.[0] ?? {
      revenue: 0, expense: 0, cost_total: 0,
      product_total: 0, salary: 0, profit: 0, order_count: 0,
    };

    return { items, summary };
  }

  /** Бүтээгдэхүүний ангиллаар нийлбэр (product_transactions хүснэгтээс) */
  async productsByCategory(filter: SnapshotFilter): Promise<{ category: string; total: number }[]> {
    const conditions: string[] = ['pt.status = 10'];
    const values: any[] = [];

    if (filter.branch_id) {
      values.push(filter.branch_id);
      conditions.push(`pt.branch_id = $${values.length}`);
    }
    if (filter.start_date) {
      values.push(filter.start_date);
      conditions.push(`pt.date >= $${values.length}`);
    }
    if (filter.end_date) {
      values.push(filter.end_date);
      conditions.push(`pt.date <= $${values.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const sql = `
      SELECT
        COALESCE(NULLIF(c.name, ''), 'Бусад') AS category,
        COALESCE(SUM(pt.total_amount), 0)::numeric AS total
      FROM "product_transactions" pt
      LEFT JOIN "products" p ON p.id = pt.product_id
      LEFT JOIN "categories" c ON c.id = p.category_id
      ${where}
      GROUP BY COALESCE(NULLIF(c.name, ''), 'Бусад')
      ORDER BY total DESC
    `;
    const rows = await this._db.select(sql, values);
    return (rows ?? []).map((r: any) => ({
      category: r.category,
      total: Number(r.total ?? 0),
    }));
  }

  /** Зардлын ангиллаар нийлбэр (costs хүснэгтээс) */
  async costsByCategory(filter: SnapshotFilter): Promise<{ category: string; total: number }[]> {
    const conditions: string[] = ['status = 10'];
    const values: any[] = [];

    if (filter.branch_id) {
      values.push(filter.branch_id);
      conditions.push(`branch_id = $${values.length}`);
    }
    if (filter.start_date) {
      values.push(filter.start_date);
      conditions.push(`date >= $${values.length}`);
    }
    if (filter.end_date) {
      values.push(filter.end_date);
      conditions.push(`date <= $${values.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const sql = `
      SELECT
        COALESCE(NULLIF(cost_category_name, ''), 'Бусад') AS category,
        COALESCE(SUM(price), 0)::numeric AS total
      FROM "costs"
      ${where}
      GROUP BY COALESCE(NULLIF(cost_category_name, ''), 'Бусад')
      ORDER BY total DESC
    `;
    const rows = await this._db.select(sql, values);
    return (rows ?? []).map((r: any) => ({
      category: r.category,
      total: Number(r.total ?? 0),
    }));
  }

  /** Өмнөх оны ижил хугацааны нийлбэр */
  async prevYearSummary(filter: SnapshotFilter) {
    const shiftYear = (d?: string) => {
      if (!d) return undefined;
      const date = new Date(d);
      date.setFullYear(date.getFullYear() - 1);
      return date.toISOString().slice(0, 10);
    };

    const prevFilter: SnapshotFilter = {
      ...filter,
      start_date: shiftYear(filter.start_date),
      end_date: shiftYear(filter.end_date),
    };

    const { conditions, values } = this.buildConditions(prevFilter);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        COALESCE(SUM(revenue), 0)::numeric AS revenue,
        COALESCE(SUM(expense), 0)::numeric AS expense,
        COALESCE(SUM(cost_total), 0)::numeric AS cost_total,
        COALESCE(SUM(product_total), 0)::numeric AS product_total,
        COALESCE(SUM(salary), 0)::numeric AS salary,
        COALESCE(SUM(profit), 0)::numeric AS profit,
        COALESCE(SUM(order_count), 0)::int AS order_count
      FROM "${tableName}" ${where}
    `;
    const rows = await this._db.select(sql, values);
    return rows?.[0] ?? {
      revenue: 0, expense: 0, cost_total: 0,
      product_total: 0, salary: 0, profit: 0, order_count: 0,
    };
  }
}
