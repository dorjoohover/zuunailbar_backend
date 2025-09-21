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
        'date',
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

  async update(data: any, attr: string[]): Promise<number> {
    console.log(data, attr);
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
  async findByDate(date: Date, merchant_id: string, branch_id: string) {
    const d = mnDate(date);

    return await this._db.select(
      `SELECT id,date, times 
    FROM "${tableName}" 
    WHERE "merchant_id"=$1 
      AND "status"=$2 
     AND "date" >= $3::date
     AND "branch_id"=$4
    ORDER BY "date" ASC
    LIMIT 7`,
      [merchant_id, STATUS.Active, d, branch_id],
    );
  }

  async findByDateTime(
    date: string,
    time: number, // 10, 11 гэх мэт
    merchant_id: string,
    branch_id: string,
  ) {
    // Монголын огноо форматлах функц
    const d = mnDate(date);

    // Огноо дээр filter хийж record-уудыг авах
    const res = await this._db.select(
      `SELECT id, date, times 
     FROM "${tableName}" 
     WHERE "merchant_id" = $1
       AND "status" = $2
       AND "date" = $3::date
       AND "branch_id" = $4`,
      [merchant_id, STATUS.Active, d, branch_id],
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
      const start_date = query.start_date;

      const end_date = query.end_date;

      const criteria = builder
        .conditionIfNotEmpty('id', 'LIKE', query.id)
        .conditionIfNotEmpty('approved_by', '=', query.approved_by)
        .conditionIfNotEmpty('branch_id', '=', query.branch_id)
        .conditionIfNotEmpty('status', '=', query.status)
        .conditionIfNotEmpty('booking_status', '=', query.booking_status)
        .conditionIfNotEmpty('date', '=', query.date)
        .conditionIfDateBetweenValues(start_date, end_date, 'date')
        // .conditionIsNotNull('times')
        .criteria();
      const sql =
        `SELECT * FROM "${tableName}" ${criteria} order by date ${query.sort === 'false' ? 'asc' : 'desc'} ` +
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
