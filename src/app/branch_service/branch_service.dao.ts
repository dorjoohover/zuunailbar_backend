import { Injectable } from '@nestjs/common';
import { STATUS } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlCondition, SqlBuilder } from 'src/core/db/pg/sql.builder';
import { BranchService } from './branch_service.entity';

const tableName = 'branch_services';

@Injectable()
export class BranchServiceDao {
  constructor(private readonly _db: AppDB) {}

  async add(data: BranchService) {
    return await this._db.insert(tableName, data, [
      'id',
      'branch_id',
      'service_id',
      'min_price',
      'max_price',
      'pre',
      'duration',
      'custom_name',
      'custom_description',
      'view',
      'index',
      'meta',
      'created_by',
      'status',
    ]);
  }

  async addMany(data: BranchService[]) {
    // Нэг ч мөр байхгүй бол шууд
    if (!data?.length) return [];

    return await this._db.insertMany(tableName, data, [
      'id',
      'branch_id',
      'service_id',
      'min_price',
      'max_price',
      'pre',
      'duration',
      'custom_name',
      'custom_description',
      'view',
      'index',
      'meta',
      'created_by',
      'status',
    ]);
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

  async getById(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
  }

  async getByUserId(id: string) {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "user_id"=$1`,
      [id],
    );
  }

  async list(query, columns?: string) {
    if (query.id) {
      query.id = `%${query.id}%`;
    }
    const builder = new SqlBuilder(query);

    builder
      .conditionIfNotEmpty('id', '=', query.id)
      .conditionIfNotEmpty('service_id', '=', query.service_id)
      .conditionIfNotEmpty('branch_id', '=', query.branch_id)
      .conditionIfNotEmpty('status', '=', query.status);

    const criteria = builder.criteria();
    const sql =
      `SELECT ${columns ?? '*'} FROM "${tableName}" ${criteria} order by ${query.order_by ?? 'created_at'} ${query.sort === 'false' ? 'asc' : 'desc'} ` +
      `${query.limit ? `limit ${query.limit}` : ''}` +
      ` offset ${+query.skip * +(query.limit ?? 0)}`;
    const countSql = `SELECT COUNT(*) FROM "${tableName}" ${criteria}`;
    const count = await this._db.count(countSql, builder.values);
    const items = await this._db.select(sql, builder.values);
    return { count, items };
  }
}
