import { Injectable } from '@nestjs/common';
import {
  OrderStatus,
  PAYMENT_STATUS,
  STATUS,
  ubDateAt00,
} from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Order } from './order.entity';
import { OrderDetailDao } from '../order_detail/order_detail.dao';

const tableName = 'orders';

@Injectable()
export class OrdersDao {
  constructor(
    private readonly _db: AppDB,
    private details: OrderDetailDao,
  ) {}

  async add(data: Order) {
    try {
      return await this._db.insert(tableName, data, [
        'id',
        'customer_id',
        'duration',
        'order_date',
        'start_time',
        'end_time',
        'status',
        'pre_amount',
        'branch_id',
        'is_pre_amount_paid',
        'salary_date',
        'total_amount',
        'paid_amount',
        'description',
        'discount_type',
        'discount',
        'voucher_id',
        'voucher_name',
        'voucher_value',
        'order_status',
      ]);
    } catch (error) {
      console.error('Order insert failed:', error);
    }
  }

  async create(order: any, details: any) {
    try {
      return this._db.withTransaction(async (client) => {
        const orderId = await this._db.insertTx(client, tableName, order, [
          'id',
          'customer_id',
          'duration',
          'order_date',
          'start_time',
          'end_time',
          'status',
          'pre_amount',
          'branch_id',
          'is_pre_amount_paid',
          'salary_date',
          'created_by',
          'total_amount',
          'paid_amount',
          'description',
          'discount_type',
          'discount',
          'voucher_id',
          'voucher_name',
          'voucher_value',
          'parallel',

          'order_status',
        ]);
        for (const detail of details) {
          await this.details.create(client, { ...detail, order_id: orderId });
        }

        return orderId;
      });
    } catch (error) {
      console.error('Order transaction failed:', error);
    }
  }

  async update(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }

  async updateTx(client: any, data: any, attr: string[]): Promise<number> {
    return await this._db.updateTx(client, tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }

  async updateOrderStatus(id: string, status: number): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "order_status"=$1 , updated_at = now() WHERE "id"=$2`,
      [status, id],
    );
  }

  async updatePaidDate(id: string, date: Date | null, type: string | null) {
    return await this._db._update(
      `UPDATE ${tableName} set "paid_at"=$1 , "transaction_type"=$2 where "id"=$3`,
      [date, type, id],
    );
  }
  async clearPaidMeta(id: string) {
    return await this.updatePaidDate(id, null, null);
  }
  async updateSalaryProcessStatus(id: string, date?: Date): Promise<number> {
    const query = `
    UPDATE "${tableName}"
    SET "salary_date" = $1
    WHERE "id" = $2
  `;
    return this._db._update(query, [date ?? null, id]);
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

  async getCancelOrders() {
    return this._db.select(
      `
    SELECT 
      o.*,
            u.mobile as mobile
    FROM "${tableName}" o
    INNER JOIN users u ON u.id = o.customer_id
    WHERE o.order_status = $1
      AND o.created_at < now() - interval '10 minutes'
      AND o.status = ${STATUS.Active}
    `,
      [OrderStatus.Pending],
    );
  }
  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT
        o.*,
        (
          SELECT b."name"
          FROM "branches" b
          WHERE b."id" = o."branch_id"
          LIMIT 1
        ) AS branch_name,
        (
          SELECT p.method
          FROM "payments" p
          WHERE p."order_id" = o."id"
            AND p."is_pre_amount" = true
            AND p."status" != ${PAYMENT_STATUS.Cancelled}
          ORDER BY p."created_at" DESC
          LIMIT 1
        ) AS pre_method,
        (
          SELECT p.method
          FROM "payments" p
          WHERE p."order_id" = o."id"
            AND COALESCE(p."is_pre_amount", false) = false
            AND p."status" != ${PAYMENT_STATUS.Cancelled}
          ORDER BY p."created_at" DESC
          LIMIT 1
        ) AS method
      FROM "${tableName}" o
      WHERE o."id"=$1`,
      [id],
    );
  }
  async getOrderByDateTime(
    date: string | Date,
    start_time: string,
    end_time: string,
    status: number,
    user_id: string,
  ) {
    const sql = `
    SELECT o.*
    FROM ${tableName} o
    JOIN order_details d ON o.id = d.order_id
    WHERE o.order_status != $1
      AND o.order_date = $2
      AND o.order_status != ${OrderStatus.Friend}
      AND d.start_time  = $3
      AND d.user_id = $4
      AND o.status = $5
  `;

    return this._db.select(sql, [
      status,
      date.toString().slice(0, 10),
      start_time,
      user_id,
      STATUS.Active,
    ]);
  }

  async getOrdersOfArtist(artistId: string) {
    const sql = `
    SELECT order_date, od.start_time as start_time, od.end_time as end_time
    FROM ${tableName} o
    inner join order_details od on od.order_id = o.id
    WHERE od.user_id = $1
      AND order_status NOT IN ($2, $3)
      AND order_date >= CURRENT_DATE - INTERVAL '1 day'
      group by order_date, od.start_time, od.end_time
      ORDER BY order_date DESC, od.end_time DESC
      `;

    const params = [artistId, OrderStatus.Cancelled, OrderStatus.Finished];

    return await this._db.select(sql, params);
  }
  async getOrderWithDetail(id: string) {
    const sql = `
    SELECT order_date, o.start_time as start_time , od.user_id as user_id
    FROM ${tableName} o
    inner join order_details od on od.order_id = o.id
    WHERE o.id = $1
      `;

    const params = [id];

    return await this._db.select(sql, params);
  }
  async get_order_details(input: { date: Date[]; artists: string[] }) {
    const { date, artists } = input;

    return await this._db.select(
      `
    SELECT 
      od.user_id, 
      od.start_ts, 
      od.end_ts
    FROM order_details od
    JOIN orders o ON o.id = od.order_id
    WHERE o.order_date = ANY($1)
      AND od.user_id = ANY($2)
      and od.view_status = 10
      and o.status = 10
      and o.order_status != 50
      and o.order_status != 60
  
    `,
      [date, artists],
    );
  }
  async getSlotsUnified(input: {
    branch_id: string;
    artists?: string[];
    categories?: string[];
    date?: Date | string;
    parallel?: boolean;
    requireAllCategoriesForQueue?: boolean;
    time?: Date | string;
  }) {
    const {
      branch_id,
      parallel,
      artists,
      categories,
      date,
      requireAllCategoriesForQueue = true,
      time,
    } = input;

    const params: any[] = [];
    let i = 1;

    let sql = `
SELECT
  branch_id,
  artist_id,
  date,
  start_time,
  finish_time
FROM availability_service_slots
WHERE end_time is null and branch_id = $${i++}
`;

    params.push(branch_id);

    if (artists?.length) {
      sql += ` AND artist_id = ANY($${i++}::text[])`;
      params.push(artists);
    }

    if (categories?.length) {
      sql += ` AND category_id = ANY($${i++}::text[])`;
      params.push(categories);
    }

    if (date) {
      sql += ` AND date = $${i++}`;
      params.push(date);
    }

    if (time) {
      sql += ` AND start_time >= $${i++}`;
      params.push(time);
    }

    sql += `
GROUP BY date, start_time, artist_id, branch_id, finish_time
HAVING MIN(available) > 0
AND COUNT(*) FILTER (WHERE end_time IS NOT NULL) = 0
`;
    if (!parallel && categories?.length && requireAllCategoriesForQueue) {
      sql += ` AND COUNT(DISTINCT category_id) = ${categories.length}`;
    }
    sql += ` ORDER BY date, start_time    
    `;

    return this._db.select(sql, params);
  }
  async getShiftBoundaries(input: {
    branch_id: string;
    artists: string[];
    date: string | Date;
  }) {
    const { branch_id, artists, date } = input;
    if (!artists.length) return [];

    const sql = `
    WITH target AS (
      SELECT (((EXTRACT(dow FROM $3::date) + 6)::numeric % 7)::integer) AS weekday_index
    )
    SELECT
      s.user_id AS artist_id,
      s.finish_time AS schedule_finish_time,
      b.finish_time AS booking_finish_time
    FROM target t
    JOIN schedules s
      ON s.index = t.weekday_index::numeric
     AND s.schedule_status = 10
     AND s.user_id = ANY($2::text[])
    LEFT JOIN bookings b
      ON b.branch_id = $1
     AND b.booking_status = 10
     AND b.index = t.weekday_index
    `;

    return this._db.select(sql, [branch_id, artists, date]);
  }
  async getOrders(userId: string, salary_day: number) {
    const today = ubDateAt00(); // moment эсвэл өөр date util
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const day = today.getUTCDate();

    // Хэрэв өнөөдөр 1-15 бол эхлэл нь 15, эсвэл 16-31 бол эхлэл нь 30
    let startDate: Date;
    if (day <= 15) {
      startDate = new Date(year, month, salary_day);
    } else {
      startDate = new Date(year, month, salary_day);
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 15);

    const sql = `
    SELECT *
    FROM ${tableName} o
    inner join order_details od on od.order_id = o.id
    WHERE o.order_status = $1
    AND o.order_status != ${OrderStatus.Friend}
      AND od.user_id = $2
      AND o.order_date >= $3
      AND o.order_date < $4
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
      AND o.order_status != ${OrderStatus.Friend}
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
      OrderStatus.Finished, // $4  <-- өмнө нь энд Active явж байсан (алдаа)
      filter.user_id, // $5
    ]);

    return row?.taken_hours ?? [];
  }

  async listWithDetails(query) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    query.friend = query.friend ? 0 : OrderStatus.Friend;
    const builder = new SqlBuilder(query);
    builder
      // nemne
      .conditionIfNotEmpty('id', 'ILIKE', query.id)
      .conditionIfNotEmpty('user_id', '=', query.user_id)
      .conditionIfNotEmpty('costumer_id', '=', query.costumer_id)
      .conditionIfNotEmpty('o.status', '=', query.status)
      .conditionIfNotEmpty('start_time', '=', query.times)
      .conditionIfNotEmpty('salary_date', '=', query.salary_date)
      .conditionIfNotEmpty('order_date', '=', query.date);
    if (!query.friend && query?.order_status != OrderStatus.Friend) {
      builder.conditionIfNotEmpty('order_status', '!=', OrderStatus.Friend);
    }
    builder.conditionIfNotEmpty('order_status', '=', query.order_status);

    const criteria = builder.criteria();
    let sql = `SELECT * FROM "${tableName}" o inner join order_details od on od.order_id = o.id  ${criteria} order by created_at ${query.sort === 'false' ? 'asc' : 'desc'} `;
    if (query.limit) sql += ` ${query.limit ? `limit ${query.limit}` : ''}`;
    if (query.skip) ` offset ${+query.skip * +(query.limit ?? 0)}`;

    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }

  async orderLimit(value: number) {
    const sql = `UPDATE app_config
SET value = ${value}
WHERE key = 'availability_days';`;
    const result = await this._db.select(sql, []);
    return result;
  }

  async getLimit() {
    const sql = `SELECT value
FROM app_config
WHERE key = 'availability_days';`;
    return await this._db.select(sql, []);
  }

  async getConfigValues(keys: string[]) {
    if (!keys.length) return {};
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const rows = await this._db.select(
      `SELECT "key", "value", "value_text" FROM app_config WHERE "key" IN (${placeholders})`,
      keys,
    );
    return rows.reduce((acc, row) => {
      acc[row.key] = row;
      return acc;
    }, {});
  }

  async upsertConfigValues(
    values: { key: string; value: number; value_text?: string | null }[],
  ) {
    for (const item of values) {
      await this._db._update(
        `INSERT INTO app_config ("key", "value", "value_text")
         VALUES ($1, $2, $3)
         ON CONFLICT ("key") DO UPDATE
         SET "value" = EXCLUDED."value",
             "value_text" = EXCLUDED."value_text"`,
        [item.key, item.value, item.value_text ?? null],
      );
    }
    return true;
  }

  async customerCheck(customer_id: string): Promise<number> {
    const sql = `
    SELECT COUNT(*) AS count
    FROM "${tableName}"
    WHERE order_status NOT IN ($1, $2, $3, $4)
      AND customer_id = $5
  `;

    const params = [
      OrderStatus.Cancelled,
      OrderStatus.Friend,
      OrderStatus.Absent,
      OrderStatus.Pending,
      customer_id,
    ];

    const result = await this._db.select(sql, params);

    // Таны select нь array буцаадаг бол (жишээ нь [{ count: '3' }]) — тэгвэл:
    const count = Number(result?.[0]?.count ?? 0);

    return count;
  }
  async list(query, columns?: string) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    query.friend = query.friend ? 0 : OrderStatus.Friend;
    const builder = new SqlBuilder(query);
    builder
      // nemne
      .conditionIfNotEmpty('id', 'ILIKE', query.id)
      .conditionIfNotEmpty('customer_id', '=', query.customer_id)
      .conditionIfNotEmpty('status', '=', query.status)
      .conditionIfNotEmpty('start_time', '=', query.times)
      .conditionIfNotEmpty('branch_id', '=', query.branch_id)
      .conditionIfNotEmpty('salary_date', '=', query.salary_date);
    if (!query?.order_status) {
      builder.conditionIfNotEmpty('order_status', '!=', OrderStatus.Friend);
      builder.conditionIfNotEmpty('order_status', '!=', OrderStatus.Cancelled);
      builder.conditionIfNotEmpty('order_status', '!=', OrderStatus.Absent);
    }
    if (!query.friend && query?.order_status != OrderStatus.Friend) {
      builder.conditionIfNotEmpty('order_status', '!=', OrderStatus.Friend);
    }
    if (query.date && !query.customer) {
      query.end_date
        ? builder.conditionIfDateBetweenValues(
            query.date,
            query.end_date,
            'order_date',
          )
        : builder.conditionIfNotEmpty('order_date', '=', query.date);
    }
    let additional = '';

    builder.conditionIfNotEmpty('order_status', '=', query.order_status);
    if (query.user_id) {
      builder.conditionRaw(
        `EXISTS (
          SELECT 1
          FROM "order_details" od
          WHERE od."order_id" = o."id"
            AND od."user_id" = $${builder.values.length + 1}
            AND COALESCE(od."view_status", ${STATUS.Active}) = ${STATUS.Active}
        )`,
        [query.user_id],
      );
    }
    if (query.customers?.length) {
      builder.values.push(query.customers);
      const index = builder.values.length;
      additional = ` AND customer_id = ANY($${index})`;
    }
    const criteria = builder.criteria();
    const defaultColumns = `o.*,
      (
        SELECT b."name"
        FROM "branches" b
        WHERE b."id" = o."branch_id"
        LIMIT 1
      ) AS branch_name,
      (
        SELECT p.method
        FROM "payments" p
        WHERE p."order_id" = o."id"
          AND p."is_pre_amount" = true
          AND p."status" != ${PAYMENT_STATUS.Cancelled}
        ORDER BY p."created_at" DESC
        LIMIT 1
      ) AS pre_method,
      (
        SELECT p.method
        FROM "payments" p
        WHERE p."order_id" = o."id"
          AND COALESCE(p."is_pre_amount", false) = false
          AND p."status" != ${PAYMENT_STATUS.Cancelled}
        ORDER BY p."created_at" DESC
        LIMIT 1
      ) AS method`;
    const sql =
      `SELECT ${columns ?? defaultColumns} FROM "${tableName}" o ${criteria} ${additional} order by created_at ${query.sort === 'false' ? 'asc' : 'desc'} ` +
      `${query.limit ? `limit ${query.limit}` : ''}` +
      ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" o ${criteria} ${additional}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }

  async search(filter: any): Promise<any[]> {
    let nameCondition = ``;
    if (filter.merchantId) {
      filter.merchantId = `%${filter.merchantId}%`;
      nameCondition = ` OR "name" ILIKE $1`;
    }

    const builder = new SqlBuilder(filter);
    const criteria = builder
      .conditionIfNotEmpty('id', 'ILIKE', filter.merchantId)
      .conditionIfNotEmpty('order_status', '!=', OrderStatus.Friend)
      .conditionIfNotEmpty('status', '!=', STATUS.Hidden)
      .criteria();
    return await this._db.select(
      `SELECT "id", CONCAT("id", '-', "name") as "value" FROM "${tableName}" ${criteria}${nameCondition}`,
      builder.values,
    );
  }
}
