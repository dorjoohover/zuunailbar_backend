import { Injectable } from '@nestjs/common';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Branch } from './branch.entity';

const tableName = 'branches';

@Injectable()
export class BranchDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: Branch) {
    return await this._db.insert(tableName, data, [
      'id',
      'merchant_id',
      'name',
      'user_id',
      'address',
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
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
  }
  async getByMerchant(id: string) {
    return await this._db.select(
      `SELECT * FROM "${tableName}" WHERE "merchant_id"=$1`,
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
    if (query.address) {
      query.address = `%${query.address}%`;
    }

    const builder = new SqlBuilder(query);
    const criteria = builder
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('merchant_id', '=', query.merchant_id)
      .conditionIfNotEmpty('address', 'lIKE', query.address)
      .conditionIfNotEmpty('name', 'LIKE', query.name)
      .conditionIfNotEmpty('status', '=', query.status)

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
      nameCondition = ` OR "name" LIKE $1`;
    }

    const builder = new SqlBuilder(filter);
    const criteria = builder
      .conditionIfNotEmpty('name', 'LIKE', filter.id)
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
