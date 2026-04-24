import { Injectable } from '@nestjs/common';
import { STATUS } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { BranchService } from './branch_service.entity';

const tableName = 'branch_services';

@Injectable()
export class BranchServiceDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: BranchService) {
    return await this._db.insert(tableName, data, [
      'id',
      'branch_id',
      'service_id',
      'min_price',
      'max_price',
      'pre',
      'duration',
      'custom_name',
      'custom_description',
      'view',
      'index',
      'meta',
      'service_count',
      'created_by',
      'status',
    ]);
  }

  async addMany(data: BranchService[]) {
    // Нэг ч мөр байхгүй бол шууд
    if (!data?.length) return [];

    return await this._db.insertMany(tableName, data, [
      'id',
      'branch_id',
      'service_id',
      'min_price',
      'max_price',
      'pre',
      'duration',
      'custom_name',
      'custom_description',
      'view',
      'index',
      'meta',
      'created_by',
      'status',
    ]);
  }

  async update(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }
  async updateStatus(id: string, status: number): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "status"=$1 WHERE "id"=$2`,
      [status, id],
    );
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT
        t.*,
        b.name AS branch_name,
        s.name AS service_name,
        sc.name AS category_name,
        jsonb_strip_nulls(
          jsonb_build_object(
            'serviceName', s.name,
            'branchName', b.name,
            'description', COALESCE(s.description, ''),
            'categoryName', sc.name
          )
        ) AS meta
      FROM "${tableName}" t
      LEFT JOIN services s ON s.id = t.service_id
      LEFT JOIN service_categories sc ON sc.id = s.category_id
      LEFT JOIN branches b ON b.id = t.branch_id
      WHERE t."id"=$1`,
      [id],
    );
  }

  async getByBranchAndService(branch_id: string, service_id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "branch_id"=$1 AND "service_id"=$2 AND "status"=$3`,
      [branch_id, service_id, STATUS.Active],
    );
  }

  async getByBranchAndServices(branch_id: string, service_ids: string[]) {
    if (!service_ids?.length) return [];
    return await this._db.select(
      `SELECT * FROM "${tableName}" WHERE "branch_id"=$1 AND "service_id" = ANY($2) AND "status"=$3`,
      [branch_id, service_ids, STATUS.Active],
    );
  }

  async getByUserId(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "user_id"=$1`,
      [id],
    );
  }
  async getServicesCategoryById(id: string) {
    const sql = `
    SELECT  t.id
    FROM "${tableName}" t
    INNER JOIN services s ON s.id = t.service_id
    WHERE s.category_id = (
      SELECT s2.category_id
      FROM "${tableName}" t2
      INNER JOIN services s2 ON s2.id = t2.service_id
      WHERE t2.id = $1
        AND t2.status = $2
      LIMIT 1
    )
    AND t.status = $2
  `;

    const result = await this._db.select(sql, [id, STATUS.Active]);

    if (!result.length) {
      return;
    }

    return result;
  }
  async list(query, columns?: string) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    const builder = new SqlBuilder(query);

    builder
      .conditionIfNotEmpty('"t"."id"', '=', query.id)
      .conditionIfNotEmpty('"t"."service_id"', '=', query.service_id)
      .conditionIfNotEmpty('"t"."branch_id"', '=', query.branch_id)
      .conditionIfNotEmpty('"t"."status"', '=', query.status ?? STATUS.Active);

    const criteria = builder.criteria();
    const allowedOrderColumns = new Set([
      'created_at',
      'updated_at',
      'index',
      'min_price',
      'max_price',
      'pre',
      'duration',
    ]);
    const orderBy = allowedOrderColumns.has(query.order_by)
      ? query.order_by
      : 'created_at';
    const defaultColumns = `t.*,
      b.name AS branch_name,
      s.name AS service_name,
      sc.name AS category_name,
      jsonb_strip_nulls(
        jsonb_build_object(
          'serviceName', s.name,
          'branchName', b.name,
          'description', COALESCE(s.description, ''),
          'categoryName', sc.name
        )
      ) AS meta`;
    let sql = `SELECT ${columns ?? defaultColumns} FROM "${tableName}" t
      LEFT JOIN services s ON s.id = t.service_id
      LEFT JOIN service_categories sc ON sc.id = s.category_id
      LEFT JOIN branches b ON b.id = t.branch_id
      ${criteria} order by t."${orderBy}" ${query.sort === 'false' ? 'asc' : 'desc'} `;
    if (query.limit) sql += ` ${query.limit ? `limit ${query.limit}` : ''}`;
    if (query.skip) ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" t ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }
}
