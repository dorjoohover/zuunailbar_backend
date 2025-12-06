import { Injectable } from '@nestjs/common';
import { STATUS } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { UserService } from './user_service.entity';

const tableName = 'user_services';

@Injectable()
export class UserServiceDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: UserService) {
    return await this._db.insert(tableName, data, [
      'id',
      'service_id',
      'user_id',
      'service_name',
      'user_name',
      'branch_id',
      'status',
    ]);
  }

  async addMany(data: UserService[]) {
    // Нэг ч мөр байхгүй бол шууд
    if (!data?.length) return [];

    return await this._db.insertMany(tableName, data, [
      'id',
      'service_id',
      'user_id',
      'service_name',
      'user_name',
      'branch_id',
      'status',
    ]);
  }
  async deleteMany(ids: string[]) {
    if (!ids.length) return;

    // Жишээ SQL, PostgreSQL
    const sql = `DELETE FROM ${tableName} WHERE id = ANY($1)`;
    const params = [ids];

    return await this._db.delete(sql, params);
  }
  async update(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }
  async updateByUser(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('user_id', '=', data.user_id),
    ]);
  }

  async updateTags(data: any): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "tags"=$1 WHERE "id"=$2`,
      [data.tags, data.id],
    );
  }

  async updateFee(id: string, fee: number) {
    return await this._db._update(
      `UPDATE "${tableName}" SET "fee"=$1 WHERE "id"=$2`,
      [fee, id],
    );
  }

  async updateStatus(id: string, status: number): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "status"=$1 WHERE "id"=$2`,
      [status, id],
    );
  }
  async updateLevel(id: string, level: number): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "level"=$1 WHERE "id"=$2`,
      [level, id],
    );
  }

  async getByServices(services: string, user?: string) {
    return await this._db.select(
      `SELECT id, user_id, service_id 
     FROM "${tableName}" 
     WHERE status = ${STATUS.Active} 
       AND ($1 = ANY(string_to_array("service_id", ',')) OR user_id = $2)`,
      [services, user],
    );
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT id, user_id, service_id FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
  }
  async getByUserId(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "user_id"=$1`,
      [id],
    );
  }

  async list(query) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    const builder = new SqlBuilder(query);

    builder
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('user_id', '=', query.user_id)
      .conditionIfNotEmpty('service_id', '=', query.service_id)
      .conditionIfNotEmpty('branch_id', '=', query.branch_id)
      .conditionIfNotEmpty('status', '=', query.status);
    if (query.services) {
      builder.conditionIfArray('service_id', query.services?.split(','));
    }

    const criteria = builder.criteria();
    let sql = `SELECT * FROM "${tableName}" ${criteria} order by created_at ${query.sort === 'false' ? 'asc' : 'desc'} `;
    if (query.limit) sql += ` ${query.limit ? `limit ${query.limit}` : ''}`;
    if (query.skip) sql += ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }
  async groupByUserList(query) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    const builder = new SqlBuilder(query);
    const criteria = builder
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('user_id', '=', query.user_id)
      .conditionIfNotEmpty('service_id', '=', query.service_id)
      .conditionIfNotEmpty('status', '=', query.status)
      .conditionIfArray('service_id', query.services?.split(','))
      .criteria();
    const sql = `
  SELECT
    user_id,
    array_agg(json_build_object(
      'service_id', service_id,
      'service_name', service_name
    )) AS services
  FROM user_services

  ${criteria}
  GROUP BY user_id
  ORDER BY MIN(created_at) DESC
  LIMIT ${query.limit ?? 20}
  OFFSET ${+query.skip * +(query.limit ?? 20)}
`;
    const countSql = `
  SELECT COUNT(DISTINCT us.user_id)
  FROM user_services us
  ${criteria}
`;

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

  async pairs(query) {
    const items = await this._db.select(
      `SELECT "id" as "key", CONCAT("id", '-', "name") as "value" FROM "${tableName}" order by "id" asc`,
      {},
    );
    return items;
  }

  async getMerchantsByTag(value: string) {
    return await this._db.select(
      `SELECT * FROM "${tableName}" m 
             WHERE $1 = ANY(m."tags")`,
      [value],
    );
  }

  async terminalList(merchantId: string) {
    return this._db.select(
      `SELECT "id", "udid", "name" FROM "TERMINALS" WHERE "merchantId"=$1 order by "id" asc`,
      [merchantId],
    );
  }

  async updateTerminalStatus(id: string, status: number) {
    return await this._db._update(
      `UPDATE "TERMINALS" SET "status"=$1 WHERE "id"=$2`,
      [status, id],
    );
  }

  async updateDeviceStatus(udid: string, status: number) {
    return await this._db._update(
      `UPDATE "DEVICES" SET "status"=$1 WHERE "udid"=$2`,
      [status, udid],
    );
  }
  async getTerminal(terminalId: string) {
    return await this._db.selectOne(`SELECT * FROM "TERMINALS" WHERE "id"=$1`, [
      terminalId,
    ]);
  }

  async getDevice(udid: string) {
    return await this._db.selectOne(`SELECT * FROM "DEVICES" WHERE "udid"=$1`, [
      udid,
    ]);
  }
}
