import { Injectable } from '@nestjs/common';
import { OrderStatus, STATUS } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Integration } from './integrations.entity';

const tableName = 'integrations';

@Injectable()
export class IntegrationDao {
  constructor(private readonly _db: AppDB) {}

  private buildListCriteria(query) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }

    const builder = new SqlBuilder(query);
    const criteria = builder
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('artist_id', '=', query.artist_id)
      .conditionIfNotEmpty('salary_status', '=', query.salary_status)
      .conditionIfNotEmpty('status', '=', query.status)
      .conditionIfDateBetweenValues(query.from, query.to, 'date')
      .criteria();

    return { builder, criteria };
  }

  async add(data: Integration) {
    return await this._db.insert(tableName, data, [
      'id',
      'artist_id',
      'date',
      'status',
      'approved_by',
      'amount',
      'order_count',
      'salary_status',
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

  async getByDate(userId: string, date: string) {
    const sql = `
      SELECT *
      FROM ${tableName}
      WHERE artist_id = $1
        AND date >= $2
    `;

    return this._db.select(sql, [userId, date]);
  }

  async list(query, cols?: string) {
    const { builder, criteria } = this.buildListCriteria(query);
    const sql =
      `SELECT ${cols ?? '*'} FROM "${tableName}" ${criteria} order by created_at ${query.sort === 'false' ? 'asc' : 'desc'} ` +
      `${query.limit ? `limit ${query.limit}` : ''}` +
      ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }

  async getListSummary(query) {
    const { builder, criteria } = this.buildListCriteria({ ...query });
    const sql = `
      SELECT
        COALESCE(SUM("amount"), 0) AS total_amount,
        COALESCE(SUM("order_count"), 0) AS total_order_count,
        COUNT(*) AS total_count
      FROM "${tableName}"
      ${criteria}
    `;

    return await this._db.selectOne(sql, builder.values);
  }

  async getArtistIncomeTotals(filter: {
    from?: string;
    to?: string;
    artist_id?: string;
  }) {
    const values: Array<string | number> = [
      STATUS.Active,
      STATUS.Active,
      OrderStatus.Finished,
      OrderStatus.Friend,
    ];
    let sql = `
      SELECT
        od."user_id" AS artist_id,
        COALESCE(SUM(od."price"), 0) AS income_amount,
        COUNT(od."id") AS order_count
      FROM "order_details" od
      INNER JOIN "orders" o ON o."id" = od."order_id"
      WHERE od."view_status" = $1
        AND o."status" = $2
        AND od."status" IN ($3, $4)
    `;

    if (filter.from || filter.to) {
      if (filter.from && filter.to) {
        values.push(filter.from, filter.to);
        sql += ` AND COALESCE(od."order_date", o."order_date") BETWEEN $${values.length - 1}::date AND $${values.length}::date`;
      } else if (filter.from) {
        values.push(filter.from);
        sql += ` AND COALESCE(od."order_date", o."order_date") >= $${values.length}::date`;
      } else if (filter.to) {
        values.push(filter.to);
        sql += ` AND COALESCE(od."order_date", o."order_date") <= $${values.length}::date`;
      }
    }

    if (filter.artist_id) {
      values.push(filter.artist_id);
      sql += ` AND od."user_id" = $${values.length}`;
    }

    sql += ` GROUP BY od."user_id"`;

    return await this._db.select(sql, values);
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
