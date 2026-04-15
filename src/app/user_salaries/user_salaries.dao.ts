import { Injectable } from '@nestjs/common';
import { SalaryStatus, STATUS, UserStatus } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { UserSalary } from './user_salary.entity';

const tableName = 'user_salaries';
const userSalaryColumns = [
  'id',
  'user_id',
  'duration',
  'percent',
  'salary_status',
  'status',
  'updated_at',
];

@Injectable()
export class UserSalariesDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: UserSalary) {
    return await this._db.insert(tableName, data, userSalaryColumns);
  }

  async addActiveLog(data: UserSalary, previousId?: string) {
    return await this._db.withTransaction(async (client) => {
      const now = data.updated_at ?? new Date();
      const params = [
        SalaryStatus.INACTIVE,
        now,
        data.user_id,
        SalaryStatus.ACTIVE,
        STATUS.Hidden,
      ];
      const previousFilter = previousId ? ` OR "id"=$6` : '';

      if (previousId) params.push(previousId as any);

      await client.query(
        `UPDATE "${tableName}"
         SET "salary_status"=$1, "updated_at"=$2
         WHERE ("user_id"=$3${previousFilter})
           AND COALESCE("salary_status", $4) = $4
           AND "status" != $5`,
        params,
      );

      return await this._db.insertTx(
        client,
        tableName,
        data,
        userSalaryColumns,
      );
    });
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
      `UPDATE "${tableName}" SET "status"=$1, "updated_at"=now() WHERE "id"=$2`,
      [status, id],
    );
  }

  async updateSalaryStatus(id: string, salaryStatus: number): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "salary_status"=$1, "updated_at"=now() WHERE "id"=$2`,
      [salaryStatus, id],
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
        `SELECT * FROM "${tableName}" WHERE "user_id"=$1 and "status" = $2 order by created_at desc`,
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
    const builder = new SqlBuilder(query);
    builder
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('duration', '=', query.duration)
      .conditionIfNotEmpty('percent', '=', query.percent)
      .conditionIfNotEmpty('user_id', '=', query.user_id)
      .conditionIfNotEmpty('salary_status', '=', query.salary_status);
    // if (query?.status == 0) {
    //   builder.orConditions([
    //     new SqlCondition('status', '=', STATUS.Active),
    //     new SqlCondition('status', '=', STATUS.Pending),
    //   ]);
    // } else {
    //   builder.conditionIfNotEmpty('status', '=', query.status);
    // }
    const statusQuery =
      query.status == 0
        ? `t.status = ${STATUS.Active} or t.status = ${STATUS.Pending}`
        : `t.status = ${query.status ?? STATUS.Active}`;
    const criteria = builder.criteria();
    const sql =
      `SELECT * FROM "${tableName}" ${criteria} order by created_at ${query.sort === 'false' ? 'asc' : 'desc'} ` +
      `${query.limit ? `limit ${query.limit}` : ''}` +
      ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(t.*) FROM "${tableName}" t inner join users u on u.id = t.user_id ${criteria} and u.status = ${STATUS.Active} and u.user_status = '${UserStatus.Active}' and ${statusQuery}`;
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
