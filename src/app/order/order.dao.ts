import { Injectable } from '@nestjs/common';
import {
  isOnlyFieldPresent,
  mnDate,
  mnDayRange,
  OrderStatus,
  ScheduleStatus,
  STATUS,
  ubDateAt00,
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

  async updateOrderStatus(id: string, status: number): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "order_status"=$1 WHERE "id"=$2`,
      [status, id],
    );
  }
  async updatePrePaid(id: string, paid: boolean): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "is_pre_amount_paid"=$1 WHERE "id"=$2`,
      [paid, id],
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

  async getOrderByDateTime(
    date: string | Date,
    start_time: string,
    end_time: string,
    status: number,
    user: string,
  ) {
    console.log(start_time, end_time, date);
    const sql = `
    SELECT *
    FROM ${tableName}
    WHERE order_status != $1
      AND user_id = $2
      AND order_date = $3
      AND start_time between $4 and $5
  `;

    return this._db.select(sql, [
      status,
      user,
      date.toString().slice(0, 10),
      start_time,
      end_time,
    ]);
  }

  async getOrders(userId: string) {
    const today = ubDateAt00(); // moment эсвэл өөр date util
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const day = today.getUTCDate();

    // Хэрэв өнөөдөр 1-15 бол эхлэл нь 15, эсвэл 16-31 бол эхлэл нь 30
    let startDate: Date;
    if (day <= 15) {
      // тухайн сарын 15
      startDate = new Date(year, month, 15);
    } else {
      // тухайн сарын 30
      startDate = new Date(year, month, 30);
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 15);

    const sql = `
    SELECT *
    FROM ${tableName}
    WHERE order_status = $1
      AND user_id = $2
      AND order_date >= $3
      AND order_date < $4
  `;

    return this._db.select(sql, [
      OrderStatus.Finished,
      userId,
      startDate.toISOString().slice(0, 10),
      endDate.toISOString().slice(0, 10),
    ]);
  }
  async checkTimes(filter: {
    user_id: string;
    times: number[];
    start_date: string; // 'YYYY-MM-DD'
  }): Promise<number[]> {
    const wanted = Array.from(
      new Set((filter.times ?? []).map(Number).filter(Number.isFinite)),
    ).sort((a, b) => a - b);
    if (wanted.length === 0) return [];

    const sql = `
    WITH wanted AS (
      SELECT unnest($2::int[]) AS h
    )
    SELECT COALESCE(array_agg(DISTINCT w.h ORDER BY w.h), '{}'::int[]) AS taken_hours
    FROM wanted w
    JOIN "${tableName}" o
      ON  o.user_id = $5
      AND o.order_date = $1::date
      AND o.status = $3
      AND o.order_status <= $4
      -- [start, end) завсарт багтсан цагийг барина
      AND (
        (
          o.end_time IS NOT NULL
          AND EXTRACT(HOUR FROM o.start_time)::int <= w.h
          AND w.h < EXTRACT(HOUR FROM o.end_time)::int
        )
        OR (
          o.end_time IS NULL
          AND EXTRACT(HOUR FROM o.start_time)::int = w.h
        )
      )
  `;

    const row = await this._db.selectOne(sql, [
      filter.start_date, // $1 ::date
      wanted, // $2 ::int[]
      STATUS.Active, // $3
      OrderStatus.Started, // $4  <-- өмнө нь энд Active явж байсан (алдаа)
      filter.user_id, // $5
    ]);

    return row?.taken_hours ?? [];
  }
  async list(query, columns?: string) {
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
      `SELECT ${columns ?? '*'} FROM "${tableName}" ${criteria} order by created_at ${query.sort === 'false' ? 'asc' : 'desc'} ` +
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
