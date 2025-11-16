import { Injectable } from '@nestjs/common';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Service } from './service.entity';

const tableName = 'services';

@Injectable()
export class ServiceDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: Service) {
    return await this._db.insert(tableName, data, [
      'id',
      'merchant_id',
      'category_id',
      'name',
      'min_price',
      'max_price',
      'duration',
      'image',
      'icon',
      'description',
      'pre',
      'status',
      'created_by',
      'view',
      'index',
      'meta',
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
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
  }
  async findName(name: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "name" like %$1%`,
      [name],
    );
  }

  async list(query, column?: string) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    if (query.name) {
      query.name = `%${query.name}%`;
    }

    const builder = new SqlBuilder(query);
    const criteria = builder
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('merchant_id', '=', query.merchant_id)
      .conditionIfNotEmpty('category_id', '=', query.category_id)
      .conditionIfNotEmpty('status', '=', query.status)
      .conditionIfNotEmpty('view', '=', query.view)
      .conditionIfNotEmpty('name', 'LIKE', query.name)
      .criteria();
    const sql =
      `SELECT ${column ?? '*'} FROM "${tableName}" ${criteria} order by created_at ${query.sort === 'false' ? 'asc' : 'desc'} ` +
      `${query.limit ? `limit ${query.limit}` : ''}` +
      ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }

  async pairs(query) {
    const items = await this._db.select(
      `SELECT "id" as "key", CONCAT("id", '-', "name") as "value" FROM "${tableName}" order by "id" asc`,
      {},
    );
    return items;
  }
}
