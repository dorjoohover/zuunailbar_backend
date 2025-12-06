import { Injectable } from '@nestjs/common';
import { STATUS } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { ArtistLeave } from './artist_leaves.entity';

const tableName = 'artist_leaves';

@Injectable()
export class ArtistLeavesDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: ArtistLeave) {
    return await this._db.insert(tableName, data, [
      'id',
      'artist_id',
      'description',
      'end_time',
      'date',
      'created_by',
      'status',
      'start_time',
    ]);
  }

  async update(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }
  async updateByDate(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('date', '=', data.date),
    ]);
  }

  async deleteOne(id: string) {
    return await this._db._update(`delete from "${tableName}"  WHERE "id"=$2`, [
      id,
    ]);
  }
  async deleteByArtist(id: string, dates?: Date[]) {
    if (!dates || dates?.length == 0) {
      return await this._db.delete(
        `DELETE FROM "${tableName}" WHERE "artist_id" = $1`,
        [id],
      );
    }

    return await this._db.delete(
      `DELETE FROM "${tableName}" 
   WHERE "artist_id" = $1 
     AND "date" = ANY($2)`,
      [id, dates],
    );
  }

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
  }
  async getByDateAndArtist(id: string, date: Date) {
    return await this._db.selectOne(
      `SELECT id, status FROM "${tableName}" WHERE "artist_id"=$1 and "date" = $2`,
      [id, date],
    );
  }

  async list(query) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    if (query.name) {
      query.name = `%${query.name}%`;
    }

    const builder = new SqlBuilder(query);

    builder
      .conditionIfNotEmpty('id', '=', query.id)
      .conditionIfNotEmpty('artist_id', '=', query.artist_id)
      .conditionIfNotEmpty('date', '=', query.date);
    if (query.start_date) {
      builder.conditionIfNotEmpty('date', '>=', query.start_date);
      // builder.conditionIfNotEmpty('end_date', '<=', query.start_date);
    }

    if (query.end_date) {
      // builder.conditionIfNotEmpty('start_date', '<=', query.end_date);
      builder.conditionIfNotEmpty('date', '>=', query.end_date);
    }

    const criteria = builder.criteria();
    let sql = `SELECT * FROM "${tableName}" ${criteria} order by created_at ${query.sort === 'false' ? 'asc' : 'desc'} `;
    if (query.limit) sql += ` ${query.limit ? `limit ${query.limit}` : ''}`;
    if (query.skip) sql += ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }
}
