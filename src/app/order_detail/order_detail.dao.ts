import { Injectable } from '@nestjs/common';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { OrderDetail } from './order_detail.entity';
import { BadRequest, OrderError } from 'src/common/error';
import { OrderStatus, STATUS } from 'src/base/constants';

const tableName = 'order_details';

@Injectable()
export class OrderDetailDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: OrderDetail) {
    return await this._db.insert(tableName, data, [
      'id',
      'order_id',
      'service_id',
      'user_id',
      'nickname',
      'start_time',
      'end_time',
      'order_date',
      'description',
      'service_name',
      'price',
      'status',
    ]);
  }
  async create(client: any, body: any) {
    try {
      await this._db.insertTx(
        client,
        tableName,
        {
          ...body,
        },
        [
          'id',
          'order_id',
          'service_id',
          'user_id',
          'nickname',
          'start_time',
          'end_time',
          'order_date',
          'description',
          'view_status',
          'service_name',
          'price',
          'status',
        ],
      );
    } catch (error) {
      console.log(error);
      if (error?.message?.includes('no_artist_time_overlap')) {
        throw new OrderError().artistTimeUnavailable;
      }
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
      `UPDATE "${tableName}" SET "status"=$1 WHERE "order_id"=$2`,
      [status, id],
    );
  }
  async updateViewStatus(id: string, status: number): Promise<number> {
    return await this._db._update(
      `UPDATE "${tableName}" SET "view_status"=$1 WHERE "order_id"=$2`,
      [status, id],
    );
  }
  async updateViewStatusTx(
    client: any,
    id: string,
    status: number,
  ): Promise<number> {
    const result = await client.query(
      `UPDATE "${tableName}" SET "view_status"=$1 WHERE "order_id"=$2`,
      [status, id],
    );
    return result.rowCount;
  }
  async delete(id: string): Promise<number> {
    return await this._db._update(
      `delete from "${tableName}" where id = $1`,
      [id],
    );
  }

  async deleteTx(client: any, id: string): Promise<number> {
    const result = await client.query(`delete from "${tableName}" where id = $1`, [
      id,
    ]);
    return result.rowCount;
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

  async findByOrder(id: string) {
    return await this._db.select(
      `SELECT * FROM "${tableName}" WHERE "order_id"=$1`,
      [id],
    );
  }
  async listOrderIds(ids: string[]) {
    return await this._db.select(
      `SELECT 
       od.*,
       u.id as artist_id,   
       u.nickname,
       u.firstname, 
       u.lastname, 
       u.mobile, 
       u.color,  
       u.branch_id AS artist_branch_id,
       u.branch_name AS artist_branch_name,
       o.branch_id,
       b.name AS branch_name

     FROM "${tableName}" od
     INNER JOIN users u ON u.id = od.user_id
     INNER JOIN orders o ON o.id = od.order_id
     LEFT JOIN branches b ON b.id = o.branch_id
     WHERE od.order_id = ANY($1)`,
      [ids],
    );
  }
  async list(query) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    if (query.name) {
      query.name = `%${query.name}%`;
    }

    const values: Array<string | number> = [
      STATUS.Active,
      STATUS.Active,
      OrderStatus.Finished,
    ];
    const conditions = [
      `COALESCE(od."view_status", $1) = $1`,
      `o."status" = $2`,
      `o."order_status" = $3`,
    ];

    const addCondition = (condition: string, value: string | number) => {
      values.push(value);
      conditions.push(condition.replace('?', `$${values.length}`));
    };

    if (query.id) addCondition(`od."id" ILIKE ?`, query.id);
    if (query.order_id) addCondition(`od."order_id" = ?`, query.order_id);
    if (query.service_id) addCondition(`od."service_id" = ?`, query.service_id);
    if (query.user_id) addCondition(`od."user_id" = ?`, query.user_id);

    if (query.from && query.to) {
      values.push(query.from, query.to);
      conditions.push(
        `COALESCE(od."order_date", o."order_date") BETWEEN $${values.length - 1}::date AND $${values.length}::date`,
      );
    } else if (query.from) {
      values.push(query.from);
      conditions.push(
        `COALESCE(od."order_date", o."order_date") >= $${values.length}::date`,
      );
    } else if (query.to) {
      values.push(query.to);
      conditions.push(
        `COALESCE(od."order_date", o."order_date") <= $${values.length}::date`,
      );
    }

    const offset =
      query.skip !== undefined && query.limit
        ? +query.skip * +(query.limit ?? 0)
        : undefined;
    const where = `WHERE ${conditions.join(' AND ')}`;
    const baseSql = `
      FROM "${tableName}" od
      INNER JOIN "orders" o ON o."id" = od."order_id"
      LEFT JOIN "branches" b ON b."id" = o."branch_id"
      LEFT JOIN "users" u ON u."id" = od."user_id"
      ${where}
    `;
    const sql = `
      WITH detail_rows AS (
        SELECT
          od.*,
          o."transaction_type",
          o."branch_id",
          b."name" AS branch_name,
          COALESCE(NULLIF(u."nickname", ''), od."nickname") AS artist_names,
          od."service_name" AS service_names,
          SUM(COALESCE(od."price", 0)) OVER (PARTITION BY o."id") AS detail_total,
          CASE
            WHEN COALESCE(o."is_pre_amount_paid", false) = true
              THEN COALESCE(o."pre_amount", 0)
            ELSE 0
          END AS order_pre_amount
        ${baseSql}
      )
      SELECT
        *,
        CASE
          WHEN order_pre_amount > 0 AND detail_total > 0
            THEN LEAST(COALESCE("price", 0), ROUND((COALESCE("price", 0) * order_pre_amount / detail_total)::numeric, 2))
          ELSE 0
        END AS pre_amount,
        CASE
          WHEN order_pre_amount > 0 AND detail_total > 0
            THEN GREATEST(COALESCE("price", 0) - LEAST(COALESCE("price", 0), ROUND((COALESCE("price", 0) * order_pre_amount / detail_total)::numeric, 2)), 0)
          ELSE COALESCE("price", 0)
        END AS paid_amount,
        COALESCE("price", 0) AS order_total_amount
      FROM detail_rows
      ORDER BY created_at ${query.sort === 'false' ? 'asc' : 'desc'}
      ${query.limit ? `limit ${query.limit}` : ''}
      ${offset !== undefined ? `offset ${offset}` : ''}
    `;

    const countSql = `SELECT COUNT(*) ${baseSql}`;
    const count = await this._db.count(countSql, values);
    const items = await this._db.select(sql, values);
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
      .conditionIfNotEmpty('view_status', '=', STATUS.Active)
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
