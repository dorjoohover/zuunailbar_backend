import { Injectable } from '@nestjs/common';
import {
  isOnlyFieldPresent,
  mnDayRange,
  ScheduleStatus,
  STATUS,
} from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Order } from './order.entity';

const tableName = 'orders';

@Injectable()
export class OrdersDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: Order) {
    try {
      return await this._db.insert(tableName, data, [
        'id',
        'user_id',
        'customer_id',
        'duration',
        'order_date',
        'start_time',
        'end_time',
        'status',
        'pre_amount',
        'is_pre_amount_paid',
        'total_amount',
        'paid_amount',
        'customer_desc',
        'order_status',
        'user_desc',
      ]);
    } catch (error) {
      console.log(error);
    }
  }

  async update(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
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

  async getByMobile(mobile: string) {
    return await this._db.select(
      `SELECT * FROM "${tableName}" WHERE "mobile"=$1`,
      [mobile],
    );
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
  }
  async checkTimes(filter: {
    user_id: string;
    times: number[];
    start_date: Date;
  }) {
    if (!Array.isArray(filter.times) || filter.times.length === 0) {
      return { taken_hours: [] as number[] };
    }

    const { start, end } = mnDayRange(filter.start_date);

    const sql = `
    SELECT ARRAY(
      SELECT DISTINCT EXTRACT(HOUR FROM "start_time")::int
      FROM "${tableName}"
      WHERE "order_date" >= $1 AND "order_date" < $2
        AND EXTRACT(HOUR FROM "start_time")::int = ANY($3::int[])
        AND status = $4
        AND order_status = $5
        AND user_id = $6
    ) AS taken_hours
  `;

    const row = await this._db.selectOne(sql, [
      start,
      end,
      filter.times.map(Number),
      STATUS.Active,
      STATUS.Active,
      filter.user_id,
    ]);
    return Array.isArray(row?.taken_hours)
      ? row.taken_hours.map(Number).filter(Number.isFinite)
      : [];
  }

  async list(query) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }

    const builder = new SqlBuilder(query);
    const criteria = builder
      // nemne
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('user_id', '=', query.user_id)
      .conditionIfNotEmpty('costumer_id', '=', query.costumer_id)
      .conditionIfNotEmpty('status', '=', query.status)
      .conditionIfNotEmpty('order_status', '=', query.order_status)
      .conditionIfNotEmpty('start_time', '=', query.times)
      .conditionIfNotEmpty('order_date', '=', query.date)

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
