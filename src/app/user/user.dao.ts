import { Injectable } from '@nestjs/common';
import { UserLevel, UserStatus } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { User } from './user.entity';
import { MobileFormat } from 'src/common/formatter';

const tableName = 'users';

@Injectable()
export class UserDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: User) {
    try {
      const res = await this._db.insert(tableName, data, [
        'id',
        'merchant_id',
        'branch_id',
        'firstname',
        'added_by',
        'lastname',
        'mail',
        'salary_day',
        'mobile',
        'birthday',
        'password',
        'experience',
        'nickname',
        'profile_img',
        'role',
        'status',
        'device',
        'user_status',
        'description',
        'color',
        'branch_name',
      ]);
      return res;
    } catch (error) {
      console.log(error);
    }
  }

  async update(data: any, attr: string[]): Promise<number> {
    try {
      console.log(tableName, data, attr, [
        new SqlCondition('id', '=', data.id),
      ]);
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
  async updateUserStatus(id: string, status: number): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "user_status"=$1 WHERE "id"=$2`,
      [status, id],
    );
  }
  async updateLevel(id: string, level: UserLevel): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "level"=$1 WHERE "id"=$2`,
      [level, id],
    );
  }

  async updatePercent(id: string, percent: number): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "percent"=$1 WHERE "id"=$2`,
      [percent, id],
    );
  }

  async getByMobile(mobile: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "mobile"=$1 or "mobile" = $2 or "mail" = $3`,
      [mobile, MobileFormat(mobile), mobile],
    );
  }
  async getByDevice(device: string) {
    return await this._db.select(
      `SELECT * FROM "${tableName}" WHERE "device"=$1`,
      [device],
    );
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1 and status != ${UserStatus.Deleted} `,
      [id],
    );
  }
  async getByMail(mail: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "mail"=$1 and status != ${UserStatus.Deleted} `,
      [mail],
    );
  }

  async list(query) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    if (query.mobile) {
      query.mobile = `%${query.mobile}%`;
    }
    if (query.firstname) {
      query.firstname = `%${query.firstname}%`;
    }
    if (query.lastname) {
      query.lastname = `%${query.lastname}%`;
    }
    if (query.nickname) {
      query.nickname = `%${query.nickname}%`;
    }
    if (query.description) {
      query.description = `%${query.description}%`;
    }
    query.limit == -1 ? (query.limit = undefined) : query.limit;
    const builder = new SqlBuilder(query);
    builder
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('status', '=', query.status)
      .conditionIfNotEmpty('branch_id', '=', query.branch_id)
      .conditionIfNotEmpty('user_status', '=', query.user_status)
      .conditionIfNotEmpty('description', 'LIKE', query.description)
      .conditionIfNotEmpty('firstname', 'LIKE', query.firstname)
      .conditionIfNotEmpty('lastname', 'LIKE', query.lastname)
      .conditionIfNotEmpty('birthday', '=', query.birthday)
      .conditionIfNotEmpty('level', '=', query.level)
      // .conditionIfNotEmpty('mobile', 'LIKE', query.mobile)
      // .conditionIfNotEmpty('nickname', 'LIKE', query.nickname)
      .conditionIfNotEmpty(
        'role',
        query.role == 35 ? '<=' : '=',
        query.role == 35 ? 40 : query.role,
      )
      .conditionIfNotEmpty(
        'role',
        query.role == 35 ? '>=' : '=',
        query.role == 35 ? 30 : query.role,
      );
    if (query.mobile) {
      builder.orConditions([
        new SqlCondition('mobile', 'LIKE', query.mobile),
        new SqlCondition('nickname', 'LIKE', query.mobile),
      ]);
    }
    const criteria = builder.criteria();

    const sql =
      `SELECT *  FROM "${tableName}" ${criteria} order by created_at ${query.sort === 'false' ? 'asc' : 'desc'} ` +
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
    builder
      .conditionIfNotEmpty('merchant_id', '=', filter.merchant)
      .conditionIfNotEmpty('branch_id', '=', filter.branch_id)
      .conditionIfNotEmpty('status', '=', filter.status)
      .conditionIfNotEmpty(
        'role',
        filter.role == 35 ? '<=' : '=',
        filter.role == 35 ? 40 : filter.role,
      )
      .conditionIfNotEmpty(
        'role',
        filter.role == 35 ? '>=' : '=',
        filter.role == 35 ? 30 : filter.role,
      )
      .orConditions([
        new SqlCondition('LOWER("nickname")', 'LIKE', filter.id),
        new SqlCondition('LOWER("mobile")', 'LIKE', filter.id),
      ]);

    const criteria = builder.criteria();
    filter.limit = filter.limit == -1 ? undefined : filter.limit;

    const sql = `
    SELECT "id",
           CONCAT(
             COALESCE("mobile", ''), '__',
             COALESCE("nickname", ''), '__',
             COALESCE("branch_id", ''), '__',
             COALESCE("color", 0),''
           ) AS "value"
    FROM "${tableName}"
    ${criteria} ${nameCondition}
    ${filter.limit ? `LIMIT ${filter.limit}` : ''}
    ${filter.skip && filter.limit ? `OFFSET ${filter.skip * filter.limit}` : ''}
  `;

    return await this._db.select(sql, builder.values);
  }
  async pairs(query) {
    const items = await this._db.select(
      `SELECT "id" as "key", CONCAT("id", '-', "name") as "value" FROM "${tableName}" order by "id" asc`,
      {},
    );
    return items;
  }
}
