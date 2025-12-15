import { Injectable } from '@nestjs/common';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { AvailabilitySlot } from './availability_slots.entity';
import { SlotAction } from 'src/base/constants';

const tableName = 'availability_slots';

@Injectable()
export class AvailabilitySlotsDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: AvailabilitySlot) {
    return await this._db.insert(tableName, data, [
      'id',
      'artist_id',
      'branch_id',
      'slots',
      'date',
    ]);
  }

  async update(data: any, attr: string[]): Promise<number> {
    return await this._db.update(tableName, data, attr, [
      new SqlCondition('id', '=', data.id),
    ]);
  }

  async deleteOne(id: string) {
    return await this._db._update(`delete from "${tableName}"  WHERE "id"=$1`, [
      id,
    ]);
  }
  async updateByArtistSlot(
    artist: string,
    date: string,
    slot: string,
    action: SlotAction,
  ) {
    const lists = await this.list({
      artist_id: artist,
      date,
    });

    let slots = (lists.items?.[0]?.slots ?? []) as string[];

    if (action === 'ADD') {
      if (!slots.includes(slot)) {
        slots.push(slot);
      }
    }

    if (action === 'REMOVE') {
      slots = slots.filter((s) => s !== slot);
    }

    return this._db._update(
      `UPDATE "${tableName}" SET slots = $1 WHERE "artist_id"=$2 AND "date"=$3`,
      [slots, artist, date],
    );
  }
  async deleteByArtist(id: string, dates?: Date[]) {
    if (!dates || dates?.length === 0) {
      return await this._db.delete(
        `DELETE FROM "${tableName}" WHERE "artist_id" = $1`,
        [id],
      );
    }

    try {
      const res = await this._db.delete(
        `delete FROM "${tableName}" WHERE "artist_id" = $1 AND "date" = ANY($2)`,
        [id, dates],
      );
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  }
  async deleteByBranch(id: string, dates?: Date[]) {
    console.log(dates, id, 'adsf');
    if (!dates || dates?.length === 0) {
      return await this._db.delete(
        `DELETE FROM "${tableName}" WHERE "branch_id" = $1`,
        [id],
      );
    }

    return await this._db.delete(
      `DELETE FROM "${tableName}" WHERE "branch_id" = $1 AND "date" = ANY($2)`,
      [id, dates],
    );
  }
  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
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
      .conditionIfNotEmpty('branch_id', '=', query.branch_id)
      .conditionIfNotEmpty('date', '=', query.date);
    if (query.start_date) {
      if (query.end_date) {
        builder.conditionIfNotEmpty('date', '>=', query.start_date);
        builder.conditionIfNotEmpty('date', '<=', query.end_date);
      } else {
        builder.conditionIfNotEmpty('date', '>=', query.start_date);
      }
    }
    if (query.artists?.length) {
      builder.conditionRaw(`"artist_id" = ANY($${builder.values.length + 1})`, [
        query.artists,
      ]);
    }

    if (query.slots?.length) {
      const slotsAsText = query.slots.map(String); // ensure it's string
      builder.conditionRaw(
        ` ("slots" && $${builder.values.length + 1}::text[])`,
        [slotsAsText],
      );
    }
    const criteria = builder.criteria();
    let sql = `SELECT * FROM "${tableName}" ${criteria} order by created_at ${query.sort === 'false' ? 'asc' : 'desc'}`;
    if (query.limit) sql += ` limit ${query.limit}`;
    if (query.skip) sql += ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }

  async getCommonDates(artists: string[]) {
    if (!artists?.length) return [];

    const sql = `
    SELECT "date"
    FROM "${tableName}"
    WHERE "artist_id" = ANY($1)
      AND "date" >= CURRENT_DATE
    GROUP BY "date"
    HAVING COUNT(DISTINCT artist_id) = $2
    ORDER BY "date" ASC
  `;

    const params = [artists, artists.length];

    const result = await this._db.select(sql, params);
    console.log(result);
    return result;
  }
}
