import { Injectable } from '@nestjs/common';
import { PAYMENT_STATUS, PaymentMethod } from 'src/base/constants';
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
  }) {
    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN is_pre_amount = true THEN amount ELSE 0 END), 0) AS pre_amount,
        COALESCE(
          SUM(
            CASE
              WHEN is_pre_amount = false AND method = $4 THEN amount
              ELSE 0
            END
          ),
          0
        ) AS cash_amount,
        COALESCE(
          SUM(
            CASE
              WHEN is_pre_amount = false AND method != $4 THEN amount
              ELSE 0
            END
          ),
          0
        ) AS bank_amount
      FROM "${tableName}"
      WHERE "merchant_id" = $1
        AND "status" != $2
        AND ("paid_at" IS NOT NULL OR "status" != $3)
        AND COALESCE("paid_at", "created_at")::date BETWEEN $5::date AND $6::date
    `;

    return await this._db.selectOne(sql, [
      filter.merchant_id,
      PAYMENT_STATUS.Cancelled,
      PAYMENT_STATUS.Pending,
      PaymentMethod.CASH,
      filter.from,
      filter.to,
    ]);
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
      .conditionIfNotEmpty('id', 'LIKE', query.id)
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
