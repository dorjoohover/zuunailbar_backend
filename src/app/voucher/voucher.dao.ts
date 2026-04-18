import { Injectable } from '@nestjs/common';
import {
  STATUS,
  VoucherStatus,
} from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition } from 'src/core/db/pg/sql.builder';
import { Voucher } from './voucher.entity';

const tableName = 'vouchers';

@Injectable()
export class VoucherDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: Voucher) {
    return await this._db.insert(tableName, data, [
      'id',
      'user_id',
      'name',
      'type',
      'value',
      'level',
      'voucher_status',
      'used_order_id',
      'used_at',
      'created_by',
      'note',
      'status',
      'service_id',
      'service_name',
      'user_name',
    ]);
  }

  async addTx(client: any, data: Voucher) {
    return await this._db.insertTx(client, tableName, data, [
      'id',
      'user_id',
      'name',
      'type',
      'value',
      'level',
      'voucher_status',
      'used_order_id',
      'used_at',
      'created_by',
      'note',
      'status',
      'service_id',
      'service_name',
      'user_name',
    ]);
  }

  async update(data: Partial<Voucher> & { id: string }, attr: string[]) {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }

  async updateTx(client: any, data: Partial<Voucher> & { id: string }, attr: string[]) {
    return await this._db.updateTx(client, tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }

  async updateStatus(id: string, status: number) {
    return await this._db._update(
      `UPDATE "${tableName}" SET "status"=$1 WHERE "id"=$2`,
      [status, id],
    );
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `
      SELECT
        v.*,
        u."mobile"
      FROM "${tableName}" v
      LEFT JOIN "users" u ON u."id" = v."user_id"
      WHERE v."id"=$1
      `,
      [id],
    );
  }

  async getByOrderId(orderId: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "used_order_id"=$1 AND "status"=$2 LIMIT 1`,
      [orderId, STATUS.Active],
    );
  }

  async getIssuedReward(userId: string, level: number) {
    return await this._db.selectOne(
      `
      SELECT *
      FROM "${tableName}"
      WHERE "user_id"=$1
        AND "level"=$2
        AND "status"=$3
      ORDER BY "created_at" DESC
      LIMIT 1
      `,
      [userId, level, STATUS.Active],
    );
  }

  async listAvailableByUser(userId: string, orderId?: string) {
    const values: Array<string | number> = [
      userId,
      STATUS.Active,
      VoucherStatus.Available,
    ];
    let sql = `
      SELECT
        v.*,
        u."mobile"
      FROM "${tableName}" v
      LEFT JOIN "users" u ON u."id" = v."user_id"
      WHERE v."user_id" = $1
        AND v."status" = $2
        AND (
          v."voucher_status" = $3
    `;

    if (orderId) {
      values.push(VoucherStatus.Used, orderId);
      sql += ` OR (v."voucher_status" = $4 AND v."used_order_id" = $5)`;
    }

    sql += `
        )
      ORDER BY v."created_at" DESC
    `;

    return await this._db.select(sql, values);
  }

  async markUsedTx(client: any, id: string, orderId: string) {
    return await this.updateTx(
      client,
      {
        id,
        voucher_status: VoucherStatus.Used,
        used_order_id: orderId,
        used_at: new Date(),
      },
      ['voucher_status', 'used_order_id', 'used_at'],
    );
  }

  async releaseTx(client: any, id: string) {
    return await this.updateTx(
      client,
      {
        id,
        voucher_status: VoucherStatus.Available,
        used_order_id: null,
        used_at: null,
      },
      ['voucher_status', 'used_order_id', 'used_at'],
    );
  }

  async releaseByOrderTx(client: any, orderId: string) {
    const result = await client.query(
      `
      UPDATE "${tableName}"
      SET
        "voucher_status" = $1,
        "used_order_id" = NULL,
        "used_at" = NULL
      WHERE "used_order_id" = $2
        AND "status" = $3
      `,
      [VoucherStatus.Available, orderId, STATUS.Active],
    );
    return result.rowCount;
  }

  async releaseByOrder(orderId: string) {
    return await this._db._update(
      `
      UPDATE "${tableName}"
      SET
        "voucher_status" = $1,
        "used_order_id" = NULL,
        "used_at" = NULL
      WHERE "used_order_id" = $2
        AND "status" = $3
      `,
      [VoucherStatus.Available, orderId, STATUS.Active],
    );
  }

  async list(query: Record<string, any>) {
    const values: Array<string | number> = [];
    const conditions: string[] = [];
    let index = 1;

    if (query.id) {
      values.push(`%${query.id}%`);
      conditions.push(`v."id" ILIKE $${index++}`);
    }

    if (query.name) {
      values.push(`%${String(query.name).toLowerCase()}%`);
      conditions.push(`
        (
          LOWER(COALESCE(v."name", '')) LIKE $${index}
          OR LOWER(COALESCE(v."user_name", '')) LIKE $${index}
          OR LOWER(COALESCE(u."mobile", '')) LIKE $${index}
        )
      `);
      index += 1;
    }

    if (query.user_id) {
      values.push(query.user_id);
      conditions.push(`v."user_id" = $${index++}`);
    }

    if (query.status) {
      values.push(query.status);
      conditions.push(`v."status" = $${index++}`);
    }

    if (query.voucher_status) {
      values.push(query.voucher_status);
      conditions.push(`v."voucher_status" = $${index++}`);
    }

    if (query.level !== undefined && query.level !== null && query.level !== '') {
      values.push(query.level);
      conditions.push(`v."level" = $${index++}`);
    }

    if (query.type) {
      values.push(query.type);
      conditions.push(`v."type" = $${index++}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const selectSql = `
      SELECT
        v.*,
        u."mobile",
        u."nickname",
        o."order_date" AS "used_order_date"
      FROM "${tableName}" v
      LEFT JOIN "users" u ON u."id" = v."user_id"
      LEFT JOIN "orders" o ON o."id" = v."used_order_id"
      ${whereClause}
      ORDER BY v."created_at" ${query.sort === 'false' ? 'ASC' : 'DESC'}
      ${query.limit ? `LIMIT ${query.limit}` : ''}
      OFFSET ${+query.skip * +(query.limit ?? 0)}
    `;

    const countSql = `
      SELECT COUNT(*)
      FROM "${tableName}" v
      LEFT JOIN "users" u ON u."id" = v."user_id"
      ${whereClause}
    `;

    const [count, items] = await Promise.all([
      this._db.count(countSql, values),
      this._db.select(selectSql, values),
    ]);

    return { count, items };
  }

  async getAppConfigValues(keys: string[]) {
    if (!keys.length) return [];

    return await this._db.select(
      `SELECT "key", "value", "value_text" FROM app_config WHERE "key" = ANY($1::text[])`,
      [keys],
    );
  }

  async upsertAppConfigValues(
    entries: Array<{
      key: string;
      value: number;
      value_text?: string | null;
    }>,
  ) {
    if (!entries.length) return 0;

    const values: Array<string | number | null> = [];
    const placeholders = entries.map((entry, itemIndex) => {
      const offset = itemIndex * 3;
      values.push(entry.key, entry.value, entry.value_text ?? null);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
    });

    return await this._db._update(
      `
      INSERT INTO app_config ("key", "value", "value_text")
      VALUES ${placeholders.join(', ')}
      ON CONFLICT ("key") DO UPDATE
      SET "value" = EXCLUDED."value",
          "value_text" = EXCLUDED."value_text"
      `,
      values,
    );
  }
}
