import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { saltOrRounds } from 'src/base/constants';
import { AppDB } from 'src/core/db/pg/app.db';
import { SqlBuilder, SqlCondition } from 'src/core/db/pg/sql.builder';

const tableName = 'users';

@Injectable()
export class AdminUserDao {
  constructor(private readonly _db: AppDB) {}

  add = async (user: any) => {
    await this._db.insert(tableName, user, [
      'id',
      'firstname',
      'lastname',
      'role',
      'mobile',
      'birthday',
      'password',
      'status',
      'description',
    ]);
  };

  update = async (user: any) => {
    await this._db.update(
      tableName,
      user,
      ['name', 'username', 'isAdmin', 'position'],
      [new SqlCondition('id', '=', user.id)],
    );
  };

  updateRoles = async (user: any) => {
    await this._db._update(
      `UPDATE "${tableName}" SET "roles" = $1 WHERE "id" = $2`,
      [user.roles, user.id],
    );
  };

  changePassword = async (id: string, password: string) => {
   
    password = await bcrypt.hash(password, saltOrRounds);

    const builder = new SqlBuilder({ password }, ['password']);

    const { cols, indexes } = builder.create();
    const criteria = builder.condition('id', '=', id).criteria();
    await this._db._update(
      `UPDATE "${tableName}" SET (${cols}) = ROW(${indexes}) ${criteria}`,
      builder.values,
    );
  };

  getById = async (id: any) => {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
  };
  getByDevice = async (device: any) => {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE "device"=$1`,
      [device],
    );
  };

  getAdminUserInfo = async (id: any) => {
    return await this._db.selectOne(
      `SELECT "id", "name", "username", "roles","isAdmin" FROM "${tableName}" WHERE "id"=$1`,
      [id],
    );
  };

  totalCount = async (filter) => {
    const { builder, criteria } = this.buildCriteria(filter);
    return await this._db.count(
      `SELECT COUNT(1) FROM "${tableName}" ${criteria}`,
      builder.values,
    );
  };

  list = async (query) => {
    const { builder, criteria } = this.buildCriteria(query);

    return await this._db.select(
      `SELECT "id", "name", "username", "roles","isAdmin","position" FROM "${tableName}" ${criteria}
            order by "created_at" asc limit ${query.limit} offset ${+query.skip * +query.limit}`,
      builder.values,
    );
  };

  buildCriteria(filter: any) {
    if (filter.endDate) {
      filter.endDate = new Date(parseInt(filter.endDate)).toISOString();
    }
    if (filter.startDate) {
      filter.startDate = new Date(parseInt(filter.startDate)).toISOString();
    }

    if (filter.name) {
      filter.name = `%${filter.name}%`;
    }

    if (filter.username) {
      filter.username = `%${filter.username}%`;
    }

    const builder = new SqlBuilder(filter);

    const criteria = builder
      .conditionIfNotEmpty('name', 'LIKE', filter.name)
      .conditionIfNotEmpty('username', 'LIKE', filter.username)
      .conditionIfNotEmpty('role', '=', filter.role)
      .conditionIfNotEmpty('created_at', '>=', filter.startDate)
      .conditionIfNotEmpty('created_at', '<=', filter.endDate)
      .criteria();
    return { builder, criteria };
  }

  async search(filter: any) {
    const builder = new SqlBuilder(filter);
    let selectFields = `"id", "name" as "value"`;

    if (filter.searchByUsername && filter.name) {
      const namePattern = `%${filter.name}%`;
      builder.orConditions([
        new SqlCondition('username', 'LIKE', namePattern),
        new SqlCondition('name', 'LIKE', namePattern),
      ]);
      selectFields = `"username" as "id", "name" as "value"`;
    } else if (filter.name) {
      const namePattern = `%${filter.name}%`;
      builder.orConditions([
        new SqlCondition('id', 'LIKE', namePattern),
        new SqlCondition('name', 'LIKE', namePattern),
      ]);
    }

    const criteria = builder.criteria();

    return await this._db.select(
      `SELECT ${selectFields} FROM "ADMIN_USERS" ${criteria}`,
      builder.values,
    );
  }

  get = async (mobile: any) => {
    return await this._db.selectOne(
      `SELECT * FROM "${tableName}" WHERE lower("mobile")= lower($1)`,
      [mobile],
    );
  };
}
