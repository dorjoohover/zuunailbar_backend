import { Injectable } from '@nestjs/common';
import { Pool, PoolClient, PoolConfig } from 'pg';

import * as fs from 'fs';
import { from } from 'pg-copy-streams';
import {
  AppDBResultNotFoundException,
  AppDBTooManyResultException,
} from '../app.db.exceptions';
import { SqlBuilder, SqlCondition } from './sql.builder';

export class DBSelectOptions {
  skip?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: string;
}

@Injectable()
export class AppDB {
  private pool: Pool | undefined;

  async getPool(): Promise<Pool> {
    if (!this.pool) {
      const opts: PoolConfig = process.env.PG_DSN
        ? {
            connectionString: process.env.PG_DSN,
          }
        : {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME,
            max: parseInt(process.env.DB_POOL_SIZE || '5'),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
          };
      this.pool = new Pool(opts);

      this.pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err);
      });
    }

    return this.pool;
  }

  async getConnection() {
    const pool = await this.getPool();
    return pool.connect();
  }

  private clientErrorListener = (err: Error) => {
    console.error('Unexpected error on active client', err);
  };

  protected async executeQuery(
    runner: (client: PoolClient) => Promise<any>,
  ): Promise<any> {
    const client = await this.getConnection();
    let clientError = undefined;

    client.on('error', this.clientErrorListener);

    try {
      return await runner(client);
    } catch (err: any) {
      clientError = err;
      throw err;
    } finally {
      client.release(clientError);
      client.off('error', this.clientErrorListener);
    }
  }

  async selectOne(sql: string, params: any): Promise<any> {
    return this.executeQuery(async (client) => {
      try {
        const result = await client.query(sql, params);
        if (result.rows.length === 0) {
          throw new AppDBResultNotFoundException('Select One not found!');
        } else if (result.rows.length === 1) {
          return result.rows[0];
        } else {
          throw new AppDBTooManyResultException('More than one result!');
        }
      } catch (err: any) {
        if (err instanceof AppDBResultNotFoundException) {
          console.warn('Select One not found!', `[${sql}], [${params}]`);
        } else if (err instanceof AppDBTooManyResultException) {
          console.warn('More than one result!', `[${sql}], [${params}]`);
        } else {
          console.warn('Select One error!', `[${sql}], [${params}]`);
        }
        throw err;
      }
    });
  }

  async select(
    sql: string,
    params: any,
    options?: DBSelectOptions,
  ): Promise<any[]> {
    return this.executeQuery(async (client) => {
      try {
        let query = sql;
        if (options && options.limit && options.skip && options.sortBy) {
          query = `${query} ORDER BY ${options.sortBy} ${options.sortDir || 'ASC'} LIMIT ${
            options.limit
          } OFFSET ${options.skip}`;
        }
        const result = await client.query(query, params);
        return result.rows;
      } catch (err: any) {
        console.warn('Select error!', `[${sql}], [${params}]`);
        throw err;
      }
    });
  }

  async count(sql: string, params: any): Promise<number> {
    return this.executeQuery(async (client) => {
      try {
        const query = {
          text: sql,
          values: params,
          rowMode: 'array',
        };
        const result = await client.query(query);
        return result.rows[0][0];
      } catch (err: any) {
        console.warn('Count error!', `[${sql}], [${params}]`);
        throw err;
      }
    });
  }

  private async _insert(sql: string, params: any): Promise<void> {
    return this.executeQuery(async (client) => {
      try {
        return await client.query(sql, params);
      } catch (e) {
        console.error('Insert error: ', sql, params);
        throw e;
      }
    });
  }
  async _update(sql: string, params: any): Promise<number> {
    return this.executeQuery(async (client) => {
      const result = await client.query(sql, params);
      return result.rowCount;
    });
  }
  async delete(sql: string, params: any): Promise<boolean> {
    return this.executeQuery(async (client) => {
      const result = await client.query(sql, params);
      return result.rowCount > 0;
    });
  }

  async insert(tableName: string, data: any, columns: string[]) {
    try {
      const builder = new SqlBuilder(data, columns);
      const { cols, indexes } = builder.create();

      const sql = `INSERT INTO "${tableName}" (${cols}) VALUES (${indexes}) RETURNING id`;

      const row = await this.selectOne(sql, builder.values);
      return row.id;
    } catch (error) {
      console.log(error);
    }
  }
  async insertMany(
    tableName: string,
    rows: any[],
    columns: any[],
  ): Promise<void> {
    return this.executeQuery(async (client) => {
      const flatValues = rows.flatMap((row) => columns.map((col) => row[col]));
      const columnNames = columns.map((name) => `"${name}"`).join(', ');
      const indexes = rows
        .map((_, i) => {
          const offset = i * columns.length;
          const placeholders = columns.map((_, j) => `$${offset + j + 1}`);
          return `(${placeholders.join(', ')})`;
        })
        .join(', ');
      try {
        await client.query(
          `INSERT INTO "${tableName}" (${columnNames}) VALUES ${indexes}`,
          flatValues,
        );
      } catch (e) {
        console.error(
          'Insert error: ',
          `INSERT INTO "${tableName}" (${columnNames}) VALUES ${indexes}`,
          flatValues,
        );
        throw e;
      }
    });
  }

  async insertFromCsv(sql: string, csvPath: string): Promise<void> {
    return this.executeQuery(async (client) => {
      const stream = client.query(from(sql));
      const fileStream = fs.createReadStream(csvPath);
      return await new Promise<void>((resolve, reject) => {
        fileStream.on('error', (err) => {
          reject(err);
        });
        fileStream
          .pipe(stream)
          .on('finish', (result: any) => {
            resolve(result);
          })
          .on('error', (err) => {
            reject(err);
          });
      });
    });
  }

  async update(
    tableName: string,
    data: any,
    columns: any[],
    conditions: SqlCondition[],
  ): Promise<number> {
    const builder = new SqlBuilder(data, columns);

    const { cols, indexes } = builder.create();
    conditions.forEach((condition) => {
      builder.condition(condition.column, condition.cond, condition.value);
    });
    const criteria = builder.criteria();

    return await this._update(
      `UPDATE "${tableName}" SET(${cols}) = ROW(${indexes}) ${criteria}`,
      builder.values,
    );
  }
}
