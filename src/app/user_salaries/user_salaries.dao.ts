import { Injectable } from '@nestjs/common';
import { STATUS } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { UserSalary } from './user_salary.entity';

const tableName = 'user_salaries';

@Injectable()
export class UserSalariesDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: UserSalary) {
    return await this._db.insert(tableName, data, [
      'id',
      'user_id',
      'duration',
      'percent',
      'date',
      'status',
    ]);
  }

  async update(data: any, attr: string[]): Promise<number> {
    try {
      return await this._db.update(tableName, data, attr, [
        new SqlCondition('id', '=', data.id),
      ]);
    } catch (error) {
      console.log(error);
      return 0;
    }
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

  async getByUser(user: string, status: STATUS) {
    try {
      return await this._db.select(
        `SELECT * FROM "${tableName}" WHERE "user_id"=$1 and "status" = $2 order by date desc`,
        [user, status],
      );
    } catch (error) {
      return [];
    }
  }

  async list(query) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    console.log(query);
    const builder = new SqlBuilder(query);
    builder
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('duration', '=', query.duration)
      .conditionIfNotEmpty('percent', '=', query.percent)
      .conditionIfNotEmpty('user_id', '=', query.user_id);
    if (query?.status == 0) {
      builder.orConditions([
        new SqlCondition('status', '=', STATUS.Active),
        new SqlCondition('status', '=', STATUS.Pending),
      ]);
    } else {
      builder.conditionIfNotEmpty('status', '=', query.status);
    }
    const criteria = builder.criteria();
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
    if (filter.merchantId) {
      filter.merchantId = `%${filter.merchantId}%`;
      nameCondition = ` OR "name" LIKE $1`;
    }

    const builder = new SqlBuilder(filter);
    const criteria = builder
      .conditionIfNotEmpty('id', 'LIKE', filter.merchantId)
      .criteria();
    return await this._db.select(
      `SELECT "id", CONCAT("id", '-', "name") as "value" FROM "${tableName}" ${criteria}${nameCondition}`,
      builder.values,
    );
  }
}
