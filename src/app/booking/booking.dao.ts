import { Injectable } from '@nestjs/common';
import { STATUS } from 'src/base/constants';
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
        'times',
        'booking_status',
      ]);
    } catch (error) {
      console.log(error);
      throw Error();
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

        // .conditionIsNotNull('times')
        .criteria();
      const sql =
        `SELECT * FROM "${tableName}" ${criteria} order by index ${query.sort === 'false' ? 'asc' : 'desc'} ` +
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
}
