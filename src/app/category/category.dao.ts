import { Injectable } from '@nestjs/common';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Category } from './category.entity';

const tableName = 'categories';

@Injectable()
export class CategoryDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: Category) {
    return await this._db.insert(tableName, data, [
      'id',
      'name',
      'merchant_id',
    ]);
  }

  async update(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
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
    const criteria = builder
      .conditionIfNotEmpty('id', 'ILIKE', query.id)
      .conditionIfNotEmpty('name', 'ILIKE', query.name)
      .criteria();
    let sql = `SELECT * FROM "${tableName}" ${criteria} order by created_at ${query.sort === 'false' ? 'asc' : 'desc'} `;

    if (query.limit) sql += ` ${query.limit ? `limit ${query.limit}` : ''}`;
    if (query.skip) sql += ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }

  async search(filter: any): Promise<any[]> {
    if (filter.id) {
      filter.id = `%${filter.id.toLowerCase()}%`;
    }

    const builder = new SqlBuilder(filter);
    const criteria = builder
      .conditionIfNotEmpty('LOWER("name")', 'ILIKE', filter.id)
      .criteria();

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
