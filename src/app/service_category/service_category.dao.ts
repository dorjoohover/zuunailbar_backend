import { Injectable } from '@nestjs/common';
import { STATUS } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { ServiceCategory } from './service_category.entity';

const tableName = 'service_categories';

@Injectable()
export class ServiceCategoryDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: ServiceCategory) {
    return await this._db.insert(tableName, data, [
      'id',
      'name',
      'merchant_id',
      'status',
    ]);
  }

  async update(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }

  async updateStatus(id: string, status: number) {
    return await this._db._update(
      `UPDATE "${tableName}" SET "status"=$1 WHERE "id"=$2`,
      [status, id],
    );
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
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
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('status', '=', query.status)
      .conditionIfNotEmpty('name', 'LIKE', query.name)
      .criteria();
    const sql =
      `SELECT * FROM "${tableName}" ${criteria} order by created_at ${query.sort === 'false' ? 'asc' : 'desc'} ` +
      `${query.limit ? `limit ${query.limit}` : ''}` +
      ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }

  async search(filter: any): Promise<any[]> {
    let nameCondition = ``;
    if (filter.id) {
      filter.id = `%${filter.id.toLowerCase()}%`;
    }

    const builder = new SqlBuilder(filter);
    const criteria = builder
      .conditionIfNotEmpty('LOWER("name")', 'LIKE', filter.id)
      .conditionIfNotEmpty('status', '=', STATUS.Active)

      .criteria();
    return await this._db.select(
      ` SELECT "id",
           CONCAT(
             COALESCE("name", ''), ''

           ) AS "value" FROM "${tableName}" ${criteria}${nameCondition}`,
      builder.values,
    );
  }
}
