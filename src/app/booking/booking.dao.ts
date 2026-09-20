import { HttpException, Injectable } from '@nestjs/common';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Booking } from './booking.entity';
import { ScheduleStatus } from 'src/base/constants';

const tableName = 'bookings';

@Injectable()
export class BookingDao {
  constructor(private readonly _db: AppDB) {}

  private rethrowSchemaError(error: any): never {
    const message = `${error?.message ?? ''}`;
    if (
      message.includes('invalid input syntax for type date') ||
      message.includes('column "finish_time"') ||
      message.includes('finish_time')
    ) {
      throw new HttpException(
        'Booking finish_time schema aldaatai baina. backend/db/2026-04-09_add_finish_time.sql migration-g ajilluulna uu.',
        500,
      );
    }
    if (message.includes('"date"')) {
      throw new HttpException(
        'Booking date schema aldaatai baina. backend/migrations/2026_08_05_leaves_into_schedules_bookings.sql migration-g ajilluulna uu.',
        500,
      );
    }
    throw error;
  }

  async add(data: Booking) {
    try {
      return await this._db.insert(tableName, data, [
        'id',
        'approved_by',
        'index',
        'date',
        'start_time',
        'end_time',
        'finish_time',
        'branch_id',
        'merchant_id',
        'times',
        'booking_status',
        'is_generated',
        'source_booking_id',
        'is_leave',
        'leave_description',
      ]);
    } catch (error) {
      console.log(error);
      this.rethrowSchemaError(error);
    }
  }

  async update(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }

  async deleteBooking(id: string): Promise<number> {
    return await this._db._update(`delete from "${tableName}" WHERE "id"=$1`, [
      id,
    ]);
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
  }

  /** Тухайн салбарын (branch_id, date) дээрх идэвхтэй мөр (upsert-ийн өмнөх шалгалт). */
  async findOne(branch_id: string, date: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "branch_id"=$1 AND "date"=$2::date AND "booking_status"=$3`,
      [branch_id, date, ScheduleStatus.Active],
    );
  }

  /**
   * `date`-с өмнөх хамгийн сүүлийн идэвхтэй мөрийг олно — 7 хоногийн залгаа
   * олдохгүй бол цааш (`maxLookbackWeeks` хүртэл) хайна. Амарсан
   * (`is_leave = true`) мөрийг эх сурвалж болгож авахгүй.
   */
  async findSourceForDate(
    branch_id: string,
    date: string,
    maxLookbackWeeks = 8,
  ) {
    return await this._db.selectOne(
      `
      SELECT *
      FROM "${tableName}"
      WHERE "branch_id" = $1
        AND "booking_status" = $2
        AND "date" < $3::date
        AND "date" >= $3::date - ($4 * 7)
        AND "index" = ((EXTRACT(DOW FROM $3::date)::int + 6) % 7)
        AND "is_leave" = false
      ORDER BY "date" DESC
      LIMIT 1
      `,
      [branch_id, ScheduleStatus.Active, date, maxLookbackWeeks],
    );
  }

  /** Тухайн цонхонд (from-to) салбарт аль хэдийн байгаа огноонуудыг буцаана. */
  async listDatesInRange(branch_id: string, from: string, to: string) {
    const rows = await this._db.select(
      `SELECT "date" FROM "${tableName}"
       WHERE "branch_id" = $1 AND "booking_status" = $2
         AND "date" BETWEEN $3::date AND $4::date`,
      [branch_id, ScheduleStatus.Active, from, to],
    );
    return new Set(
      (rows ?? []).map((r: any) => new Date(r.date).toISOString().slice(0, 10)),
    );
  }

  /** Идэвхтэй мөртэй бүх (өвөрмөц) салбаруудын id-г буцаана. */
  async listDistinctBranches(): Promise<string[]> {
    const rows = await this._db.select(
      `SELECT DISTINCT "branch_id" FROM "${tableName}" WHERE "booking_status" = $1`,
      [ScheduleStatus.Active],
    );
    return (rows ?? []).map((r: any) => r.branch_id);
  }

  /**
   * Admin шинэ долоо хоног гараар тавихад, түүнээс хойших бүрэн автоматаар
   * үүсгэгдсэн (is_generated=true) мөрүүдийг устгана.
   */
  async deleteGeneratedFrom(branch_id: string, fromDateExclusive: string) {
    return await this._db._update(
      `DELETE FROM "${tableName}"
       WHERE "branch_id" = $1
         AND "date" > $2::date
         AND "is_generated" = true`,
      [branch_id, fromDateExclusive],
    );
  }

  async deleteSchedule(id: string): Promise<number> {
    return await this.deleteBooking(id);
  }

  /** app_config.availability_days-ийг уншина (schedule модультой ижил key). */
  async getAvailabilityDays(): Promise<number> {
    const row = await this._db.selectOne(
      `SELECT "value" FROM app_config WHERE "key" = 'availability_days' LIMIT 1`,
      [],
    );
    const value = Number(row?.value);
    return Number.isFinite(value) && value > 0 ? value : 30;
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

      const criteria = builder
        .conditionIfNotEmpty('id', '=', query.id)
        .conditionIfNotEmpty('approved_by', '=', query.approved_by)
        .conditionIfNotEmpty('branch_id', '=', query.branch_id)
        .conditionIfNotEmpty('merchant_id', '=', query.merchant_id)
        .conditionIfNotEmpty('booking_status', '=', query.booking_status)
        .conditionIfNotEmpty('index', '=', query.index)
        .conditionIfNotEmpty('date', '=', query.date)
        .conditionIfNotEmpty('is_generated', '=', query.is_generated);
      if (query.date_from || query.date_to) {
        builder.conditionIfDateBetweenValues(
          query.date_from,
          query.date_to,
          'date',
        );
      }
      const finalCriteria = criteria.criteria();
      let sql = `SELECT * FROM "${tableName}" ${finalCriteria} order by date ${query.sort === 'false' ? 'asc' : 'desc'} `;
      if (query.limit) sql += ` ${query.limit ? `limit ${query.limit}` : ''}`;
      if (query.skip) ` offset ${+query.skip * +(query.limit ?? 0)}`;
      const countSql = `SELECT COUNT(*) FROM "${tableName}" ${finalCriteria}`;
      const count = await this._db.count(countSql, builder.values);
      const items = await this._db.select(sql, builder.values);
      return { count, items };
    } catch (error) {
      console.log(error);
      this.rethrowSchemaError(error);
    }
  }

  /**
   * Амралттай (`is_leave = true`) мөрүүдийг жагсаана — тусдаа "Салбарын
   * амралт" хуудасны зориулалттай (хуучин `branch_leaves`-ийн оронд).
   * Салбарын нэр болон тавьсан хэрэглэгчийн нэрийг join хийж авна.
   */
  async listLeaves(query: {
    branch_id?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    skip?: number;
    sort?: string;
  }) {
    const builder = new SqlBuilder(query);
    const criteria = builder
      .conditionRaw('b."is_leave" = true')
      .conditionIfNotEmpty('b.branch_id', '=', query.branch_id)
      .conditionIfNotEmpty('b.date', '=', query.date);
    if (query.date_from || query.date_to) {
      builder.conditionIfDateBetweenValues(
        query.date_from,
        query.date_to,
        'b.date',
      );
    }
    const finalCriteria = criteria.criteria();
    const sql = `
      SELECT b.*,
        br.name AS branch_name,
        creator.nickname AS creator_nickname,
        creator.firstname AS creator_firstname,
        creator.lastname AS creator_lastname
      FROM "${tableName}" b
      LEFT JOIN "branches" br ON br.id::text = b.branch_id::text
      LEFT JOIN "users" creator ON creator.id::text = b.approved_by::text
      ${finalCriteria}
      ORDER BY b.date ${query.sort === 'false' ? 'asc' : 'desc'}
      ${query.limit ? `LIMIT ${+query.limit}` : ''}
      OFFSET ${+(query.skip ?? 0) * +(query.limit ?? 0)}
    `;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" b ${finalCriteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }
}
