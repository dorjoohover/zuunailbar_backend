import { Injectable } from '@nestjs/common';
import { STATUS } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Branch } from './branch.entity';

const tableName = 'branches';

@Injectable()
export class BranchDao {
  constructor(private readonly _db: AppDB) {}
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
  async add(data: Branch) {
    try {
      return await this._db.insert(tableName, data, [
        'id',
        'merchant_id',
        'user_id',
        'name',
        'address',
        'status',
        'order_days',
      ]);
    } catch (error) {
      console.log(error);
      throw Error();
    }
  }

  async update(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }

  async deleteBranch(id: string): Promise<number> {
    return await this._db._update(`delete from "${tableName}" WHERE "id"=$1`, [
      id,
    ]);
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
  }
  async getByMerchant(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "merchant_id"=$1`,
      [id],
    );
  }

  async list(query) {
    try {
      if (query.id) {
        query.id = `%${query.id}%`;
      }

      if (query.start_time) {
        query.start_time = `%${query.start_time}%`;
      }
      if (query.end_time) {
        query.end_time = `%${query.end_time}%`;
      }

      const builder = new SqlBuilder(query);

      const criteria = builder
        .conditionIfNotEmpty('id', '=', query.id)
        .conditionIfNotEmpty('user_id', '=', query.user_id)
        .conditionIfNotEmpty('branch_id', '=', query.branch_id)
        .conditionIfNotEmpty('merchant_id', '=', query.merchant_id)
        .conditionIfNotEmpty('status', '=', query.status)
        .conditionIfNotEmpty('name', 'like', query.name)
        .conditionIfNotEmpty('index', '=', query.index)

        // .conditionIsNotNull('times')
        .criteria();
      let sql = `SELECT * FROM "${tableName}" ${criteria} order by index ${query.sort === 'false' ? 'asc' : 'desc'} `;
      if (query.limit) sql += ` ${query.limit ? `limit ${query.limit}` : ''}`;
      if (query.skip) ` offset ${+query.skip * +(query.limit ?? 0)}`;
      const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
      const count = await this._db.count(countSql, builder.values);
      const items = await this._db.select(sql, builder.values);
      return { count, items };
    } catch (error) {
      console.log(error);
    }
  }
  async updateStatus(id: string, status: number): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "status"=$1 WHERE "id"=$2`,
      [status, id],
    );
  }
}
