import { Injectable } from '@nestjs/common';
import { OrderStatus } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';

const tableName = 'order_status_logs';

@Injectable()
export class OrderLogDao {
  constructor(private readonly _db: AppDB) {}

  async add(data) {
    try {
      return await this._db.insert(tableName, data, [
        'order_id',
        'old_status',
        'new_status',
        'old_order_status',
        'new_order_status',
        'changed_by',
      ]);
    } catch (error) {
      console.log(error);
    }
  }

  async list(query, columns?: string) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    query.friend = query.friend ? 0 : OrderStatus.Friend;
    const builder = new SqlBuilder(query);
    builder
      // nemne
      .conditionIfNotEmpty('id', 'LIKE', query.id)
      .conditionIfNotEmpty('order_id', '=', query.customer_id)
      .conditionIfNotEmpty('new_status', '=', query.new_status)
      .conditionIfNotEmpty('old_status', '=', query.old_status)
      .conditionIfNotEmpty('new_order_status', '=', query.new_order_status)
      .conditionIfNotEmpty('old_order_status', '=', query.old_order_status)
      .conditionIfNotEmpty('changed_by', '=', query.changed_by)
      .conditionIfNotEmpty('changed_at', '=', query.changed_at);

    const criteria = builder.criteria();
    let date_sql = ``;
    if (query.changed_at) {
      date_sql = `
    AND changed_at >= '${query.changed_at} 00:00:00'
    AND changed_at < '${query.changed_at} 23:59:59'
  `;
    }
    const sql = `SELECT ${columns ?? `oh.*, u.mobile AS customer_mobile`}
   FROM "${tableName}" oh
   LEFT JOIN orders o ON o.id = oh.order_id
   LEFT JOIN users u ON u.id = o.customer_id
   ${criteria} ${date_sql}
   ORDER BY oh.changed_at DESC
   ${query.limit ? `LIMIT ${query.limit}` : ''}
   OFFSET ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `
  SELECT COUNT(*)
  FROM "${tableName}" oh
  ${criteria} ${date_sql}
`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }
}
