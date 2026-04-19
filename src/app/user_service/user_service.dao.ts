import { Injectable } from '@nestjs/common';
import { OrderStatus, STATUS, UserStatus } from 'src/base/constants';
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
  async checkUsersOrder(
    user_id: string,
    order_date: string,
    start_time: string,
  ) {
    const sql = `
    SELECT o.id
    FROM orders o
    INNER JOIN order_details od ON o.id = od.order_id
    WHERE od.user_id = $1
      AND o.order_date = $2
      AND od.start_time = $3
      AND o.order_status IN ($4, $5, $6, $7)
  `;

    return await this._db.select(sql, [
      user_id,
      order_date,
      start_time,
      OrderStatus.Active,
      OrderStatus.Finished,
      OrderStatus.Friend,
      OrderStatus.Pending,
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

  async updateBranchByUser(
    user_id: string,
    branch_id?: string | null,
  ): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "branch_id"=$1 WHERE "user_id"=$2`,
      [branch_id ?? null, user_id],
    );
  }

  async hasActiveAssignment(input: {
    user_id: string;
    service_id: string;
    branch_id: string;
  }) {
    const { user_id, service_id, branch_id } = input;

    const item = await this._db.selectOne(
      `
    SELECT 1
    FROM "${tableName}" us
    INNER JOIN users u ON u.id = us.user_id
    WHERE us.user_id = $1
      AND us.service_id = $2
      AND us.branch_id = $3
      AND us.status = $4
      AND u.user_status = $5
    LIMIT 1
    `,
      [user_id, service_id, branch_id, STATUS.Active, UserStatus.Active],
    );

    return !!item;
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
  // async updateLevel(id: string, level: number): Promise<number> {
  //   return await this._db._update(
  //     `UPDATE "${tableName}" SET "level"=$1 WHERE "id"=$2`,
  //     [level, id],
  //   );
  // }

  async getByServices(input: { services: string[]; u?: string; branch_id }) {
    const { services, branch_id, u } = input;
    const user = u || '';
    return await this._db.select(
      `
    SELECT user_id
    FROM "${tableName}" us
    inner join users u on u.id = us.user_id 
    WHERE us.status = $1 
      AND service_id = ANY($2) and us.branch_id = $3 and u.user_status = $4
      group by user_id
    `,
      [STATUS.Active, services, branch_id, UserStatus.Active],
    );
  }
  async getByServicesAll(input: {
    services: string[];
    u?: string;
    branch_id: string;
  }) {
    const { services, u, branch_id } = input;
    return await this._db.select(
      `
    SELECT user_id
    FROM "${tableName}" us
        inner join users u on u.id = us.user_id 
    WHERE us.status = $1
      AND service_id = ANY($2) and us.branch_id = $3 and u.user_status = $4
    GROUP BY user_id
    HAVING COUNT(DISTINCT service_id) = $5
    `,
      [STATUS.Active, services, branch_id, UserStatus.Active, services.length],
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
    if (query.limit && query.limit > 0) sql += ` ${query.limit ? `limit ${query.limit}` : ''}`;
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
    builder
      .conditionIfNotEmpty('us.id', 'LIKE', query.id)
      .conditionIfNotEmpty('us.user_id', '=', query.user_id)
      .conditionIfNotEmpty('us.service_id', '=', query.service_id)
      .conditionIfArray('us.service_id', query.services?.split(','));

    const criteria = builder.criteria();
    const sql = `
  SELECT
    user_id,
    array_agg(json_build_object(
      'service_id', service_id,
      'service_name', service_name
    )) AS services
  FROM user_services us
  inner join users u on u.id = us.user_id
  
  ${criteria}
  ${query.user_status ? ` and u.user_status = ${query.user_status} and u.status = ${STATUS.Active}` : ''}
  and us.status = ${STATUS.Active}
  GROUP BY user_id
  ORDER BY MIN(us.created_at) DESC
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
