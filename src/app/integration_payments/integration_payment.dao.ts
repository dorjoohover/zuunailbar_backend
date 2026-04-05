import { Injectable } from '@nestjs/common';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { IntegrationPayment } from './integration_payment.entity';
import { SALARY_LOG_STATUS, STATUS } from 'src/base/constants';

const tableName = 'integration_payments';

@Injectable()
export class IntegrationPaymentDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: IntegrationPayment) {
    return await this._db.insert(tableName, data, [
      'id',
      'integration_id',
      'artist_id',
      'type',
      'amount',
      'paid_by',
      'paid_at',
    ]);
  }
  async transaction<T>(callback: (trx: any) => Promise<T>): Promise<T> {
    return this._db.withTransaction(async (trx) => {
      return await callback(trx);
    });
  }

  // ---- Existing methods ----

  async getIntegrationForUpdate(trx, artist_id: string) {
    return trx.query(
      `SELECT * FROM integrations
       WHERE artist_id = $1 and salary_status = ${SALARY_LOG_STATUS.Pending}
       FOR UPDATE`,
      [artist_id],
    );
  }

  async getPaidAmount(trx, integrationId: string) {
    return trx.query(
      `SELECT COALESCE(SUM(amount),0) as total
       FROM integration_payments
       WHERE integration_id = $1
         AND COALESCE(status, $2) = $2`,
      [integrationId, STATUS.Active],
    );
  }

  async insertPayment(trx, dto: any) {
    return trx.query(
      `INSERT INTO integration_payments
       (id, integration_id, artist_id, type, amount, paid_by, paid_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,now(),$7)`,
      [
        dto.id,
        dto.integration_id,
        dto.artist_id,
        dto.type,
        dto.amount,
        dto.paid_by,
        STATUS.Active,
      ],
    );
  }

  async updateIntegrationStatus(trx, integrationId: string, status: number) {
    return trx.query(
      `UPDATE integrations
       SET salary_status = $1
       WHERE id = $2`,
      [status, integrationId],
    );
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

  async getByDate(integration: string, date: string) {
    const sql = `
      SELECT *
      FROM ${tableName}
      WHERE integration_id = $1
        AND paid_at >= $2
    `;

    return this._db.select(sql, [integration, date]);
  }
  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
  }

  async list(query, cols?: string) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }

    const builder = new SqlBuilder(query);
    const criteria = builder
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('integration_id', '=', query.integration_id)
      .conditionIfNotEmpty('artist_id', '=', query.artist_id)
      .conditionIfNotEmpty('paid_by', '=', query.paid_by)
      .conditionIfNotEmpty('type', '=', query.type)
      .conditionIfDateBetweenValues(query.from, query.to, '"paid_at"::date')
      .criteria();
    const statusCriteria = query.status
      ? `${criteria ? `${criteria} AND` : 'WHERE'} COALESCE("status", ${STATUS.Active}) = ${query.status}`
      : criteria;
    const sql =
      `SELECT ${cols ?? '*'} FROM "${tableName}" ${statusCriteria} order by paid_at ${query.sort === 'false' ? 'asc' : 'desc'} ` +
      `${query.limit ? `limit ${query.limit}` : ''}` +
      ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${statusCriteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }
  async getArtistTransferTotals(filter: {
    from?: string;
    to?: string;
    artist_id?: string;
  }) {
    const values: Array<string | number> = [STATUS.Active];
    let sql = `
      SELECT
        artist_id,
        COALESCE(SUM(amount), 0) AS transferred_amount
      FROM "${tableName}"
      WHERE COALESCE("status", $1) = $1
    `;

    if (filter.from || filter.to) {
      if (filter.from && filter.to) {
        values.push(filter.from, filter.to);
        sql += ` AND "paid_at"::date BETWEEN $${values.length - 1}::date AND $${values.length}::date`;
      } else if (filter.from) {
        values.push(filter.from);
        sql += ` AND "paid_at"::date >= $${values.length}::date`;
      } else if (filter.to) {
        values.push(filter.to);
        sql += ` AND "paid_at"::date <= $${values.length}::date`;
      }
    }

    if (filter.artist_id) {
      values.push(filter.artist_id);
      sql += ` AND "artist_id" = $${values.length}`;
    }

    sql += ` GROUP BY "artist_id"`;

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
}
