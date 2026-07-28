import { Injectable } from '@nestjs/common';
import { AppDB } from 'src/core/db/pg/app.db';

const tableName = 'message_logs';

@Injectable()
export class MessageLogDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: { mobile: string; message: string; success: boolean }) {
    try {
      await this._db.insert(tableName, data, ['mobile', 'message', 'success']);
    } catch (error) {
      // Хүснэгт байхгүй тохиолдолд алдаагаар зогсохгүй
      console.error('Message log insert failed:', error?.message ?? error);
    }
  }

  async list(query: { skip?: number; limit?: number } = {}) {
    try {
      const limit = query.limit ?? 50;
      const offset = (query.skip ?? 0) * limit;
      const sql = `
        SELECT id, mobile, message, success,
               to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
        FROM "${tableName}"
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      const countSql = `SELECT COUNT(*) FROM "${tableName}"`;
      const [items, count] = await Promise.all([
        this._db.select(sql, []),
        this._db.count(countSql, []),
      ]);
      return { items, count };
    } catch (error) {
      console.error('Message log list failed:', error?.message ?? error);
      return { items: [], count: 0 };
    }
  }
}
