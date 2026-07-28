import { Injectable } from '@nestjs/common';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { ProductTransaction } from './product_transaction.entity';

const tableName = 'product_transactions';

@Injectable()
export class ProductTransactionDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: ProductTransaction) {
    return await this._db.insert(tableName, data, [
      'id',
      'product_id',
      'quantity',
      'price',
      'total_amount',
      'branch_id',
      'user_id',
      'date',
      'created_by',
      'status',
      'product_transaction_status',
    ]);
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

  async list(query) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    const transactionStatus =
      query.transaction_status ?? query.product_transaction_status;

    const builder = new SqlBuilder(query);
    const criteria = builder
      .conditionIfNotEmpty('id', 'ILIKE', query.id)
      .conditionIfNotEmpty('user_id', '=', query.user_id)
      .conditionIfNotEmpty('product_id', '=', query.product_id)
      .conditionIfNotEmpty('branch_id', '=', query.branch_id)
      .conditionIfNotEmpty('status', '=', query.status)
      .conditionIfNotEmpty(
        'product_transaction_status',
        '=',
        transactionStatus,
      )
      .conditionIfDateBetweenValues(query.start_date, query.end_date, 'date')
      .criteria();
    const sql =
      `SELECT * FROM "${tableName}" ${criteria} order by COALESCE("date", created_at::date) ${query.sort === 'false' ? 'asc' : 'desc'}, created_at ${query.sort === 'false' ? 'asc' : 'desc'} ` +
      `${query.limit && query.limit != -1 ? `limit ${query.limit}` : ''}` +
      ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
    const summarySql = `SELECT COALESCE(SUM("total_amount"), 0)::numeric AS total FROM "${tableName}" ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    const summaryRows = await this._db.select(summarySql, builder.values);
    const total = Number(summaryRows?.[0]?.total ?? 0);
    return { count, items, summary: { total } };
  }

  async listWithDetails(query: any) {
    if (query.id) query.id = `%${query.id}%`;
    const transactionStatus =
      query.transaction_status ?? query.product_transaction_status;
    const builder = new SqlBuilder(query);
    const criteria = builder
      .conditionIfNotEmpty('pt.id', 'ILIKE', query.id)
      .conditionIfNotEmpty('pt.user_id', '=', query.user_id)
      .conditionIfNotEmpty('pt.product_id', '=', query.product_id)
      .conditionIfNotEmpty('pt.branch_id', '=', query.branch_id)
      .conditionIfNotEmpty('pt.status', '=', query.status)
      .conditionIfNotEmpty(
        'pt.product_transaction_status',
        '=',
        transactionStatus,
      )
      .conditionIfDateBetweenValues(query.start_date, query.end_date, 'pt.date')
      .criteria();
    const sql = `
      SELECT pt.*,
        b.name AS branch_name,
        p.name AS product_name,
        c.name AS category_name,
        CONCAT(COALESCE(u.lastname, ''), ' ', COALESCE(u.firstname, '')) AS user_name
      FROM "${tableName}" pt
      LEFT JOIN "branches" b ON b.id = pt.branch_id
      LEFT JOIN "products" p ON p.id = pt.product_id
      LEFT JOIN "categories" c ON c.id = p.category_id
      LEFT JOIN "users" u ON u.id = pt.user_id
      ${criteria}
      ORDER BY COALESCE(pt.date, pt.created_at::date) ${query.sort === 'false' ? 'asc' : 'desc'}, pt.created_at ${query.sort === 'false' ? 'asc' : 'desc'}
    `;
    const items = await this._db.select(sql, builder.values);
    return { items };
  }

  async lastPurchasePrices(productId: string, limit = 3) {
    return await this._db.select(
      `SELECT "date", "unit_price", "price", "total_amount", "quantity"
       FROM "product_logs"
       WHERE "product_id" = $1
         AND COALESCE("status", 10) = 10
       ORDER BY "date" DESC NULLS LAST, "created_at" DESC
       LIMIT ${Math.max(1, Math.min(20, +limit || 3))}`,
      [productId],
    );
  }

  async search(filter: any): Promise<any[]> {
    const term = ((filter.id ?? filter.name ?? '') + '').trim().toLowerCase();
    const builder = new SqlBuilder(filter);
    if (term) {
      builder.conditionIfNotEmpty('LOWER("name")', 'ILIKE', `%${term}%`);
    }
    const criteria = builder.criteria();
    return await this._db.select(
      `SELECT "id", CONCAT("id", '-', "name") as "value" FROM "${tableName}" ${criteria}`,
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
