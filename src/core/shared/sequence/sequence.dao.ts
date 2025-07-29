import { Injectable } from "@nestjs/common";
import { AppDB } from "src/core/db/pg/app.db";

const tableName = "SEQUENCES";

@Injectable()
export class SequenceDao {
    constructor(private readonly _db: AppDB) {}
    add = async (key: string, value: number) => {
        await this._db.insert(tableName, { key, value }, ["key", "value"]);
    };

    update = async (key: string, value: number): Promise<number> => {
        return await this._db._update(
            `UPDATE "${tableName}" SET "value" = $1 WHERE "key" = $2`,
            [value, key],
        );
    };

    get = async (key: string) => {
        return await this._db.selectOne(
            `SELECT * FROM "${tableName}" WHERE "key" = $1`,
            [key],
        );
    };
}