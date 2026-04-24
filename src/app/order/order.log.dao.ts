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
      console.error('Order status log insert failed:', error);
    }
  }

  async addTx(client: any, data) {
    return await this._db.insertTx(client, tableName, data, [
      'order_id',
      'old_status',
      'new_status',
      'old_order_status',
      'new_order_status',
      'changed_by',
    ]);
  }

  async list(query, columns?: string) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    query.friend = query.friend ? 0 : OrderStatus.Friend;
    const builder = new SqlBuilder(query);
    builder
      // nemne
      .conditionIfNotEmpty('"oh"."id"', 'ILIKE', query.id)
      .conditionIfNotEmpty('"oh"."order_id"', '=', query.customer_id)
      .conditionIfNotEmpty('"oh"."new_status"', '=', query.new_status)
      .conditionIfNotEmpty('"oh"."old_status"', '=', query.old_status)
      .conditionIfNotEmpty(
        '"oh"."new_order_status"',
        '=',
        query.new_order_status,
      )
      .conditionIfNotEmpty(
        '"oh"."old_order_status"',
        '=',
        query.old_order_status,
      )
      .conditionIfNotEmpty('"oh"."changed_by"', '=', query.changed_by);

    const criteria = builder.criteria();
    let date_sql = ``;
    if (query.changed_at) {
      date_sql = `
    ${criteria ? 'AND' : 'WHERE'} oh.changed_at >= '${query.changed_at} 00:00:00'
    AND oh.changed_at < '${query.changed_at} 23:59:59'
  `;
    }
    const sql = `SELECT ${
      columns ??
      `oh.id,
      oh.order_id,
      oh.old_status,
      oh.new_status,
      oh.old_order_status,
      oh.new_order_status,
      oh.changed_by,
      to_char(oh.changed_at, 'YYYY-MM-DD HH24:MI:SS') AS changed_at,
      u.mobile AS customer_mobile,
      COALESCE(
        NULLIF(u.nickname, ''),
        NULLIF(TRIM(CONCAT(
          CASE
            WHEN u.lastname IS NOT NULL AND u.lastname <> '' THEN CONCAT(u.lastname, '.')
            ELSE ''
          END,
          COALESCE(u.firstname, '')
        )), ''),
        ''
      ) AS customer_name,
      o.branch_id,
      b.name AS branch_name,
      COALESCE((
        SELECT STRING_AGG(DISTINCT COALESCE(
          NULLIF(artist.nickname, ''),
          NULLIF(TRIM(CONCAT(
            CASE
              WHEN artist.lastname IS NOT NULL AND artist.lastname <> '' THEN CONCAT(artist.lastname, '.')
              ELSE ''
            END,
            COALESCE(artist.firstname, '')
          )), ''),
          artist.mobile,
          ''
        ), ', ')
        FROM "order_details" od
        LEFT JOIN users artist ON artist.id = od.user_id
        WHERE od.order_id = o.id
      ), '') AS artist_names`
    }
   FROM "${tableName}" oh
   LEFT JOIN orders o ON o.id = oh.order_id
   LEFT JOIN users u ON u.id = o.customer_id
   LEFT JOIN branches b ON b.id = o.branch_id
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
