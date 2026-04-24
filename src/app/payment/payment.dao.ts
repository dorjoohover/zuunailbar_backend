import { Injectable } from '@nestjs/common';
import {
  OrderStatus,
  PAYMENT_STATUS,
  PaymentMethod,
  STATUS,
} from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Payment } from './payment.entity';

const tableName = 'payments';

@Injectable()
export class PaymentDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: Payment) {
    return await this._db.insert(tableName, data, [
      'id',
      'merchant_id',
      'order_id',
      'order_detail_id',
      'invoice_id',
      'payment_id',
      'qr_text',
      'qr_image',
      'amount',
      'method',
      'status',
      'is_pre_amount',
      'paid_at',
      'created_by',
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
  async getByInvoiceId(invoiceId: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "invoice_id"=$1 ORDER BY "created_at" DESC LIMIT 1`,
      [invoiceId],
    );
  }
  async getByOrder(id: string) {
    return await this._db.selectOne(
      `SELECT invoice_id FROM "${tableName}" WHERE "order_id"=$1 AND "invoice_id" IS NOT NULL ORDER BY "created_at" DESC LIMIT 1`,
      [id],
    );
  }
  async listByOrder(orderId: string) {
    return await this._db.select(
      `SELECT * FROM "${tableName}" WHERE "order_id"=$1 ORDER BY "created_at" ASC`,
      [orderId],
    );
  }
  async getDailySummary(filter: {
    merchant_id: string;
    from: string;
    to: string;
    branch_id?: string;
  }) {
    const values: Array<string | number> = [
      filter.merchant_id,
      filter.from,
      filter.to,
      STATUS.Active,
      OrderStatus.Finished,
      PaymentMethod[PaymentMethod.CASH],
      PaymentMethod[PaymentMethod.CARD],
    ];
    let sql = `
      WITH detail_sales AS (
        SELECT
          o."id",
          COALESCE(od."price", 0) AS detail_amount,
          SUM(COALESCE(od."price", 0)) OVER (PARTITION BY o."id") AS detail_total,
          CASE
            WHEN COALESCE(o."is_pre_amount_paid", false) = true
              THEN COALESCE(o."pre_amount", 0)
            ELSE 0
          END AS order_pre_amount,
          UPPER(COALESCE(o."transaction_type", '')) AS transaction_type
        FROM "orders" o
        INNER JOIN "order_details" od
          ON od."order_id" = o."id"
         AND COALESCE(od."view_status", ${STATUS.Active}) = ${STATUS.Active}
        INNER JOIN "branches" b ON b."id" = o."branch_id"
        WHERE b."merchant_id" = $1
          AND COALESCE(od."order_date", o."order_date") BETWEEN $2::date AND $3::date
          AND o."status" = $4
          AND o."order_status" = $5
    `;

    if (filter.branch_id) {
      values.push(filter.branch_id);
      sql += ` AND o."branch_id" = $${values.length}`;
    }

    sql += `
      ),
      allocated_sales AS (
        SELECT
          detail_amount,
          CASE
            WHEN order_pre_amount > 0 AND detail_total > 0
              THEN LEAST(detail_amount, ROUND((detail_amount * order_pre_amount / detail_total)::numeric, 2))
            ELSE 0
          END AS pre_amount,
          CASE
            WHEN order_pre_amount > 0 AND detail_total > 0
              THEN GREATEST(detail_amount - LEAST(detail_amount, ROUND((detail_amount * order_pre_amount / detail_total)::numeric, 2)), 0)
            ELSE detail_amount
          END AS paid_amount,
          transaction_type
        FROM detail_sales
      )
      SELECT
        COALESCE(SUM(pre_amount), 0) AS pre_amount,
        COALESCE(
          SUM(
            CASE
              WHEN paid_amount > 0 AND transaction_type = $6 THEN paid_amount
              ELSE 0
            END
          ),
          0
        ) AS cash_amount,
        COALESCE(
          SUM(
            CASE
              WHEN paid_amount > 0 AND transaction_type = $7 THEN paid_amount
              ELSE 0
            END
          ),
          0
        ) AS card_amount,
        COALESCE(
          SUM(
            CASE
              WHEN paid_amount > 0 AND transaction_type != $6 AND transaction_type != $7 THEN paid_amount
              ELSE 0
            END
          ),
          0
        ) AS bank_amount
      FROM allocated_sales
    `;

    return await this._db.selectOne(sql, values);
  }

  async getDailyBreakdown(filter: {
    merchant_id: string;
    from: string;
    to: string;
    branch_id?: string;
  }) {
    const values: Array<string | number> = [
      filter.merchant_id,
      filter.from,
      filter.to,
      STATUS.Active,
      OrderStatus.Finished,
    ];
    let sql = `
      WITH detail_sales AS (
        SELECT
          od."id",
          o."id" AS order_id,
          COALESCE(od."order_date", o."order_date") AS order_date,
          COALESCE(od."price", 0) AS detail_amount,
          SUM(COALESCE(od."price", 0)) OVER (PARTITION BY o."id") AS detail_total,
          COALESCE(o."discount", 0) AS order_discount,
          o."voucher_name",
          CASE
            WHEN COALESCE(o."is_pre_amount_paid", false) = true
              THEN COALESCE(o."pre_amount", 0)
            ELSE 0
          END AS order_pre_amount,
          o."transaction_type",
          o."branch_id",
          b."name" AS branch_name,
          COALESCE(od."nickname", u."nickname") AS artist_names,
          od."service_name" AS service_names
      FROM "orders" o
      INNER JOIN "branches" b ON b."id" = o."branch_id"
      INNER JOIN "order_details" od
        ON od."order_id" = o."id"
       AND COALESCE(od."view_status", ${STATUS.Active}) = ${STATUS.Active}
      LEFT JOIN "users" u ON u."id" = od."user_id"
      WHERE b."merchant_id" = $1
        AND COALESCE(od."order_date", o."order_date") BETWEEN $2::date AND $3::date
        AND o."status" = $4
        AND o."order_status" = $5
    `;

    if (filter.branch_id) {
      values.push(filter.branch_id);
      sql += ` AND o."branch_id" = $${values.length}`;
    }

    sql += `
      )
      SELECT
        id,
        order_id,
        order_date,
        CASE
          WHEN order_pre_amount > 0 AND detail_total > 0
            THEN LEAST(detail_amount, ROUND((detail_amount * order_pre_amount / detail_total)::numeric, 2))
          ELSE 0
        END AS pre_amount,
        CASE
          WHEN order_discount > 0 AND detail_total > 0
            THEN LEAST(detail_amount, ROUND((detail_amount * order_discount / detail_total)::numeric, 2))
          ELSE 0
        END AS discount_amount,
        CASE
          WHEN order_pre_amount > 0 AND detail_total > 0
            THEN GREATEST(detail_amount - LEAST(detail_amount, ROUND((detail_amount * order_pre_amount / detail_total)::numeric, 2)), 0)
          ELSE detail_amount
        END AS paid_amount,
        detail_amount AS amount,
        transaction_type,
        branch_id,
        branch_name,
        artist_names,
        service_names,
        voucher_name,
        detail_amount AS order_total_amount
      FROM detail_sales
      WHERE detail_amount > 0
      ORDER BY order_date DESC, id DESC
    `;

    return await this._db.select(sql, values);
  }

  async list(query, cols?: string) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    if (query.name) {
      query.name = `%${query.name.toLowerCase()}%`;
    }

    const builder = new SqlBuilder(query);
    const criteria = builder
      .conditionIfNotEmpty('id', 'ILIKE', query.id)
      .conditionIfNotEmpty('order_id', '=', query.order_id)
      .conditionIfNotEmpty('order_detail_id', '=', query.order_detail_id)
      .conditionIfNotEmpty('method', '=', query.method)
      .conditionIfNotEmpty('invoice_id', '=', query.invoice_id)
      .conditionIfNotEmpty('payment_id', '=', query.payment_id)
      .conditionIfNotEmpty('status', '=', query.status)
      .conditionIfNotEmpty('is_pre_amount', '=', query.is_pre_amount)
      .criteria();
    let sql = `SELECT ${cols ?? '*'} FROM "${tableName}" ${criteria} order by GREATEST("quantity", 0) DESC NULLS LAST, LOWER("name") ASC,   created_at ${query.sort === 'false' ? 'asc' : 'desc'} `;
    if (query.limit) sql += `${query.limit ? `limit ${query.limit}` : ''}`;
    if (query.skip) sql += ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }
  async count(filters?: Record<string, any>) {
    const builder = new SqlBuilder(filters ?? {});
    const whereClause = builder.criteria(); // → 'WHERE ...' хэлбэртэй болно

    const sql = `SELECT COUNT(*) FROM "${tableName}" ${whereClause}`;
    const result = await this._db.count(sql, builder.values);

    return result;
  }
}
