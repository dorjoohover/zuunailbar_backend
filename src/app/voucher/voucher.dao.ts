import { Injectable } from '@nestjs/common';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Voucher } from './voucher.entity';
import { STATUS, VoucherStatus } from 'src/base/constants';

const tableName = 'vouchers';

@Injectable()
export class VoucherDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: Voucher) {
    return await this._db.insert(tableName, data, [
      'id',
      'service_id',
      'user_id',
      'service_name',
      'user_name',
      'mobile',
      'status',
      'type',
      'value',
      'level',
      'voucher_status',
      'note',
      'used_order_id',
      'used_order_date',
      'used_at',
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
  async getByService(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "service_id"=$1`,
      [id],
    );
  }

  async availableByUser(userId: string, orderId?: string) {
    const params: any[] = [userId, VoucherStatus.Available, STATUS.Active];
    let usedBySameOrder = '';
    if (orderId) {
      params.push(orderId);
      usedBySameOrder = ` OR "used_order_id"=$${params.length}`;
    }

    return await this._db.select(
      `SELECT *
       FROM "${tableName}"
       WHERE "user_id"=$1
         AND "status"=$3
         AND ("voucher_status"=$2${usedBySameOrder})
       ORDER BY "created_at" DESC`,
      params,
    );
  }

  async list(query) {
    try {
      if (query.id) {
        query.id = `%${query.id}%`;
      }
      if (query.name) {
        query.name = `%${query.name}%`;
      }

      const builder = new SqlBuilder(query);
      builder
        .conditionIfNotEmpty('v."id"', 'ILIKE', query.id)
        .conditionIfNotEmpty('v."name"', 'ILIKE', query.name)
        .conditionIfNotEmpty('v."user_id"', '=', query.user_id)
        .conditionIfNotEmpty('v."service_id"', '=', query.service_id)
        .conditionIfNotEmpty('v."status"', '=', query.status)
        .conditionIfNotEmpty('v."type"', '=', query.type)
        .conditionIfNotEmpty('v."voucher_status"', '=', query.voucher_status)
        .conditionIfNotEmpty('v."level"', '=', query.level);
      const criteria = builder.criteria();
      const sql =
        `SELECT v.*, COALESCE(v."user_name", u."nickname") AS "user_name", u."mobile" AS "mobile", u."level" AS "user_level"
         FROM "${tableName}" v
         LEFT JOIN "users" u ON u."id" = v."user_id"
         ${criteria} order by v."created_at" ${query.sort === 'false' ? 'asc' : 'desc'} ` +
        `${query.limit ? `limit ${query.limit}` : ''}` +
        ` offset ${+query.skip * +(query.limit ?? 0)}`;
      const countSql = `SELECT COUNT(*) FROM "${tableName}" v ${criteria}`;
      const count = await this._db.count(countSql, builder.values);
      const items = await this._db.select(sql, builder.values);
      return { count, items };
    } catch (error) {
      console.log(error);
    }
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
