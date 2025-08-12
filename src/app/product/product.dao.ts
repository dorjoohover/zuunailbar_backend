import { Injectable } from '@nestjs/common';
import { isOnlyFieldPresent } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Product } from './product.entity';

const tableName = 'products';

@Injectable()
export class ProductDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: Product) {
    return await this._db.insert(tableName, data, [
      'id',
      'name',
      'ref',
      'quantity',
      'price',
      'color',
      'brand_id',
      'category_id',
      'category_name',
      'brand_name',
      'status',
      'type',
      'size',
      'merchant_id',
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
    if (query.name) {
      query.name = `%${query.name}%`;
    }

    const builder = new SqlBuilder(query);
    const criteria = builder
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('brand_id', '=', query.brand_id)
      .conditionIfNotEmpty('category_id', '=', query.category_id)
      .conditionIfNotEmpty('category_id', '!=', query.spending)
      .conditionIfNotEmpty('name', 'LIKE', query.name)
      .conditionIfNotEmpty('type', '=', query.type)

      .conditionIfNotEmpty('status', '=', query.status)
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
  async count(filters?: Record<string, any>) {
    const builder = new SqlBuilder(filters ?? {});
    const whereClause = builder.criteria(); // → 'WHERE ...' хэлбэртэй болно

    const sql = `SELECT COUNT(*) FROM "${tableName}" ${whereClause}`;
    const result = await this._db.count(sql, builder.values);

    return result;
  }
  async search(filter: any): Promise<any[]> {
    let nameCondition = ``;
    if (filter.id) {
      filter.id = `%${filter.id.toLowerCase()}%`;
      nameCondition = ` OR LOWER("name") LIKE $1`;
    }

    const builder = new SqlBuilder(filter);
    const criteria = builder
      .conditionIfNotEmpty('merchant_id', '=', filter.merchant)
      .conditionIfNotEmpty('status', '=', filter.status)
      .conditionIfNotEmpty('LOWER("name")', 'LIKE', filter.id)
      .criteria();

    return await this._db.select(
      `SELECT "id", 
     CONCAT(
       COALESCE("brand_name", ''), '__',
       COALESCE("category_name", ''), '__',
       COALESCE("name", ''), '__',
       COALESCE("quantity", 0)
     ) AS "value"
   FROM "${tableName}" 
   ${criteria}${nameCondition}`,
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
