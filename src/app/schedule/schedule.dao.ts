import { Injectable } from '@nestjs/common';
import { isOnlyFieldPresent, ScheduleStatus, STATUS } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Schedule } from './schedule.entity';

const tableName = 'schedules';

@Injectable()
export class ScheduleDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: Schedule) {
    return await this._db.insert(tableName, data, [
      'id',
      'user_id',
      'approved_by',
      'date',
      'start_time',
      'end_time',
      'branch_id',
      'status',
      'type',
      'times',
      'schedule_status',
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

  async getAvailableTimes(date: Date) {
    try {
      const sql = `
    SELECT ARRAY(
      SELECT DISTINCT unnest(string_to_array("times",'|')::int[])
      FROM "${tableName}"
      WHERE "date"::date = $1::date and status=${STATUS.Active} and schedule_status=${ScheduleStatus.Active}
    ) AS all_times
  `;

      const row = await this._db.selectOne(sql, [date]);
      // { all_times: number[] }

      return {
        date,
        times: (row?.all_times ?? []).map(Number).sort((a, b) => a - b),
      };
    } catch (error) {
      return { date, times: [] };
    }
  }

  async list(query) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    if (query.start_time) {
      query.start_time = `%${query.start_time}%`;
    }
    if (query.end_time) {
      query.end_time = `%${query.end_time}%`;
    }

    const builder = new SqlBuilder(query);
    const criteria = builder
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('approved_by', '=', query.approved_by)
      .conditionIfNotEmpty('branch_id', '=', query.branch_id)
      .conditionIfNotEmpty('status', '=', query.status)
      .conditionIfNotEmpty('schedule_status', '=', query.schedule_status)

      .conditionIfNotEmpty('user_id', '=', query.user_id)
      .conditionIfNotEmpty('date', '=', query.date)
      .orConditions([
        {
          column: 'times',
          cond: 'LIKE',
          value: query.start_time,
        },
        {
          column: 'times',
          cond: 'LIKE',
          value: query.end_time,
        },
      ])
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
