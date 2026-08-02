import { HttpException, Injectable } from '@nestjs/common';
import { ScheduleStatus } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Schedule } from './schedule.entity';

const tableName = 'schedules';

@Injectable()
export class ScheduleDao {
  constructor(private readonly _db: AppDB) {}

  private rethrowSchemaError(error: any): never {
    const message = `${error?.message ?? ''}`;
    if (
      message.includes('invalid input syntax for type date') ||
      message.includes('column "finish_time"') ||
      message.includes('finish_time')
    ) {
      throw new HttpException(
        'Schedule finish_time schema aldaatai baina. backend/db/2026-04-09_add_finish_time.sql migration-g ajilluulna uu.',
        500,
      );
    }
    if (message.includes('"date"')) {
      throw new HttpException(
        'Schedule date schema aldaatai baina. backend/migrations/2026_07_26_schedules_date_based.sql migration-g ajilluulna uu.',
        500,
      );
    }
    throw error;
  }

  async add(data: Schedule) {
    try {
      return await this._db.insert(tableName, data, [
        'id',
        'user_id',
        'approved_by',
        'index',
        'date',
        'start_time',
        'end_time',
        'finish_time',
        'branch_id',
        'meta',
        'times',
        'schedule_status',
        'is_generated',
        'source_schedule_id',
      ]);
    } catch (error) {
      this.rethrowSchemaError(error);
    }
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

  async getByUser(user_id: string) {
    try {
      return await this._db.select(
        `SELECT * FROM "${tableName}" WHERE "user_id"=$1 order by date `,
        [user_id],
      );
    } catch (error) {
      console.log(error);
    }
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
  }

  /** Тухайн артистын (user_id, date) дээрх идэвхтэй мөр (upsert-ийн өмнөх шалгалт). */
  async findOne(user_id: string, date: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "user_id"=$1 AND "date"=$2::date AND "schedule_status"=$3`,
      [user_id, date, ScheduleStatus.Active],
    );
  }

  /**
   * `date`-с өмнөх хамгийн сүүлийн идэвхтэй мөрийг олно — 7 хоногийн залгаа
   * олдохгүй бол цааш (`maxLookbackWeeks` хүртэл) хайна.
   */
  async findSourceForDate(
    user_id: string,
    date: string,
    maxLookbackWeeks = 8,
  ) {
    return await this._db.selectOne(
      `
      SELECT *
      FROM "${tableName}"
      WHERE "user_id" = $1
        AND "schedule_status" = $2
        AND "date" < $3::date
        AND "date" >= $3::date - ($4 * 7)
        AND "index" = ((EXTRACT(DOW FROM $3::date)::int + 6) % 7)
      ORDER BY "date" DESC
      LIMIT 1
      `,
      [user_id, ScheduleStatus.Active, date, maxLookbackWeeks],
    );
  }

  /** Тухайн цонхонд (from-to) артистад аль хэдийн байгаа огноонуудыг буцаана. */
  async listDatesInRange(user_id: string, from: string, to: string) {
    const rows = await this._db.select(
      `SELECT "date" FROM "${tableName}"
       WHERE "user_id" = $1 AND "schedule_status" = $2
         AND "date" BETWEEN $3::date AND $4::date`,
      [user_id, ScheduleStatus.Active, from, to],
    );
    return new Set(
      (rows ?? []).map((r: any) =>
        new Date(r.date).toISOString().slice(0, 10),
      ),
    );
  }

  /** Идэвхтэй хуваарьтай бүх (өвөрмөц) артистуудын id-г буцаана. */
  async listDistinctArtists(): Promise<string[]> {
    const rows = await this._db.select(
      `SELECT DISTINCT "user_id" FROM "${tableName}" WHERE "schedule_status" = $1`,
      [ScheduleStatus.Active],
    );
    return (rows ?? []).map((r: any) => r.user_id);
  }

  /**
   * Admin шинэ долоо хоног гараар тавихад, түүнээс хойших бүрэн автоматаар
   * үүсгэгдсэн (is_generated=true) мөрүүдийг устгана — ингэснээр
   * ensureAvailabilityWindow() дараагийн удаа шинэ эх сурвалжаас дахин зөв
   * тооцоолж үүсгэнэ. Admin өөрөө тавьсан (is_generated=false) долоо хоногийг
   * (болон түүнээс цааших) хөндөхгүй.
   */
  async deleteGeneratedFrom(user_id: string, fromDateExclusive: string) {
    return await this._db._update(
      `DELETE FROM "${tableName}"
       WHERE "user_id" = $1
         AND "date" > $2::date
         AND "is_generated" = true`,
      [user_id, fromDateExclusive],
    );
  }

  async deleteSchedule(id: string): Promise<number> {
    return await this._db._update(`delete from "${tableName}" WHERE "id"=$1`, [
      id,
    ]);
  }

  async list(query) {
    try {
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
      builder
        .conditionIfNotEmpty('id', 'ILIKE', query.id)
        .conditionIfNotEmpty('approved_by', '=', query.approved_by)
        .conditionIfNotEmpty('branch_id', '=', query.branch_id)
        .conditionIfNotEmpty('schedule_status', '=', query.schedule_status)
        .conditionIfNotEmpty('user_id', '=', query.user_id)
        .conditionIfNotEmpty('is_generated', '=', query.is_generated)
        .conditionIfNotEmpty('date', '=', query.date)
        .conditionIfNotEmpty('index', '=', query.index);
      if (query.date_from || query.date_to) {
        builder.conditionIfDateBetweenValues(
          query.date_from,
          query.date_to,
          'date',
        );
      }
      if (query.times) builder.conditionIsNotNull('times');
      const criteria = builder.criteria();
      const sql =
        `SELECT * FROM "${tableName}" ${criteria} order by date ${query.sort === 'false' ? 'asc' : 'desc'} ` +
        `${query.limit ? `limit ${query.limit}` : ''}` +
        ` offset ${+(query.skip ?? 0) * +(query.limit ?? 0)}`;
      const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
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
      .conditionIfNotEmpty('index', '=', filter.index)
      .conditionIfNotEmpty(
        'schedule_status',
        '=',
        filter.schedule_status ?? ScheduleStatus.Active,
      )
      .conditionIsNotNull('times')
      .conditionRaw(`"times" <> ''`)
      .criteria();
    return await this._db.select(
      `SELECT "id", "user_id", "times" as value FROM "${tableName}" ${criteria}${nameCondition}`,
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

  /** app_config.availability_days-ийг уншина (VIEW-үүдийн ашигладаг key-тэй ижил). */
  async getAvailabilityDays(): Promise<number> {
    const row = await this._db.selectOne(
      `SELECT "value" FROM app_config WHERE "key" = 'availability_days' LIMIT 1`,
      [],
    );
    const value = Number(row?.value);
    return Number.isFinite(value) && value > 0 ? value : 30;
  }
}
