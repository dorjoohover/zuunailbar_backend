import { Injectable } from '@nestjs/common';
import { isOnlyFieldPresent, mnDate, STATUS } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { Booking } from './booking.entity';

const tableName = 'bookings';

@Injectable()
export class BookingDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: Booking) {
    try {
      return await this._db.insert(tableName, data, [
        'id',
        'approved_by',
        'index',
        'start_time',
        'end_time',
        'branch_id',
        'merchant_id',
        'status',
        'times',
        'booking_status',
      ]);
    } catch (error) {
      console.log(error);
      throw Error();
    }
  }

  async getLastWeek(merchant_id: string, branch_id: string) {
    // Огноо дээр filter хийж record-уудыг авах
    const res = await this._db.select(
      `SELECT id, index, times
   FROM "${tableName}"
   WHERE "merchant_id" = $1
     AND "status" = $2
     AND "branch_id" = $3
   ORDER BY index 
   LIMIT 7`,
      [merchant_id, STATUS.Active, branch_id],
    );

    if (!res || res.length === 0) return null;

    return res;
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

  async findByDateTime(
    date: number,
    time: number, // 10, 11 гэх мэт
    merchant_id: string,
    branch_id: string,
  ) {
    // Огноо дээр filter хийж record-уудыг авах
    const res = await this._db.select(
      `SELECT id, index, times 
     FROM "${tableName}" 
     WHERE "merchant_id" = $1
       AND "status" = $2
       AND "index" = $3
       AND "branch_id" = $4`,
      [merchant_id, STATUS.Active, date, branch_id],
    );

    if (!res || res.length === 0) return null; // record байхгүй бол

    // res нь массив, times нь массив учраас тухайн time байгаа эсэхийг filter хийж авна
    const availableTimes: number[] = [];
    for (const record of res) {
      if (record.times) {
        const timesArray = record.times.split('|').map((t) => parseInt(t, 10));
        availableTimes.push(...timesArray);
      }
    }

    // тухайн time байгаа эсэхийг boolean-аар шалгах
    const isTimeAvailable = availableTimes.includes(time);

    return { availableTimes, isTimeAvailable };
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
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
        .conditionIfNotEmpty('id', 'LIKE', query.id)
        .conditionIfNotEmpty('approved_by', '=', query.approved_by)
        .conditionIfNotEmpty('branch_id', '=', query.branch_id)
        .conditionIfNotEmpty('status', '=', query.status)
        .conditionIfNotEmpty('booking_status', '=', query.booking_status)
        .conditionIfNotEmpty('index', '=', query.index)

        // .conditionIsNotNull('times')
        .criteria();
      const sql =
        `SELECT * FROM "${tableName}" ${criteria} order by index ${query.sort === 'false' ? 'asc' : 'desc'} ` +
        `${query.limit ? `limit ${query.limit}` : ''}` +
        ` offset ${+query.skip * +(query.limit ?? 0)}`;
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
