import { Injectable } from '@nestjs/common';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { CostCategory } from './cost_category.entity';

const tableName = 'cost_categories';

@Injectable()
export class CostCategoryDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: CostCategory) {
    return await this._db.insert(tableName, data, [
      'id',
      'name',
      'merchant_id',
      'parent_id',
    ]);
  }

  async update(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT c.*, p."name" AS "parent_name"
       FROM "${tableName}" c
       LEFT JOIN "${tableName}" p ON p."id" = c."parent_id"
       WHERE c."id"=$1`,
      [id],
    );
  }

  async hasChildren(id: string): Promise<boolean> {
    const row = await this._db.selectOne(
      `SELECT 1 AS "x" FROM "${tableName}" WHERE "parent_id" = $1 LIMIT 1`,
      [id],
    );
    return !!row;
  }

  async deleteById(id: string) {
    return await this._db._update(`DELETE FROM "${tableName}" WHERE "id"=$1`, [
      id,
    ]);
  }

  async list(query) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    if (query.name) {
      query.name = `%${query.name}%`;
    }

    const builder = new SqlBuilder(query);
    builder
      .conditionIfNotEmpty('c.id', 'ILIKE', query.id)
      .conditionIfNotEmpty('c.name', 'ILIKE', query.name)
      .conditionIfNotEmpty('c.parent_id', '=', query.parent_id);
    if (query.top_level === 'true' || query.top_level === true) {
      builder.conditionRaw('c."parent_id" IS NULL');
    }
    if (query.leaf === 'true' || query.leaf === true) {
      builder.conditionRaw(
        `NOT EXISTS (SELECT 1 FROM "${tableName}" cc WHERE cc."parent_id" = c."id")`,
      );
    }
    const criteria = builder.criteria();

    let sql = `SELECT c.*, p."name" AS "parent_name"
               FROM "${tableName}" c
               LEFT JOIN "${tableName}" p ON p."id" = c."parent_id"
               ${criteria}
               ORDER BY c.created_at ${query.sort === 'false' ? 'asc' : 'desc'} `;

    if (query.limit) sql += ` ${query.limit ? `limit ${query.limit}` : ''}`;
    if (query.skip) sql += ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" c ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }

  async search(filter: any): Promise<any[]> {
    if (filter.id) {
      filter.id = `%${filter.id.toLowerCase()}%`;
    }

    const builder = new SqlBuilder(filter);
    builder.conditionIfNotEmpty('LOWER("name")', 'ILIKE', filter.id);
    if (filter.exclude_id) {
      builder.conditionIfNotEmpty('id', '!=', filter.exclude_id);
    }
    if (filter.top_level === 'true' || filter.top_level === true) {
      builder.conditionRaw('"parent_id" IS NULL');
    }
    if (filter.leaf === 'true' || filter.leaf === true) {
      builder.conditionRaw(
        `NOT EXISTS (SELECT 1 FROM "${tableName}" cc WHERE cc."parent_id" = "${tableName}"."id")`,
      );
    }
    const criteria = builder.criteria();

    return await this._db.select(
      `SELECT "id",
            CONCAT(
              COALESCE("name", ''), ''

            ) AS "value" FROM "${tableName}" ${criteria}`,
      builder.values,
    );
  }

  async pairs(query) {
    const items = await this._db.select(
      `SELECT "id" as "key", CONCAT("id", '-', "name") as "value" FROM "${tableName}" order by "id" asc`,
      {},
    );
    return items;
  }
}
