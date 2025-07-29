import { Injectable } from "@nestjs/common";
import { AppDBResultNotFoundException } from "src/core/db/app.db.exceptions";
import { AppUtils } from "src/core/utils/app.utils";
import { SequenceDao } from "./sequence.dao";

@Injectable()
export class SequenceService {
    constructor(private sequenceDao: SequenceDao) {}

    public async current(key: string): Promise<number> {
        let value = 1;
        try {
            const existing = await this.sequenceDao.get(key);
            value = existing.value;
        } catch (err) {
            if (err instanceof AppDBResultNotFoundException) {
                await this.sequenceDao.add(key, value);
            } else {
                throw err;
            }
        }
        return value;
    }

    public async next(key: string, max: number) {
        let value = 1;
        try {
            const existing = await this.sequenceDao.get(key);
            if (existing.value >= max) {
                value = 1;
            } else {
                value = existing.value + 1;
            }
            await this.sequenceDao.update(key, value);
        } catch (err) {
            if (err instanceof AppDBResultNotFoundException) {
                await this.sequenceDao.add(key, value);
            } else {
                throw err;
            }
        }
        return value;
    }

    public async nextZeroPadded(key: string, length: number, max: number) {
        const value = await this.next(key, max);
        return AppUtils.zeroPadding(value, length);
    }

    // public async nextTraceno(terminal: Terminal) {
    //     return this.nextZeroPadded(
    //         `${terminal.merchantId}|${terminal.id}`,
    //         6,
    //         999999,
    //     );
    // }

    // public async nextBatchno(terminal: Terminal) {
    //     return this.nextZeroPadded(
    //         `${terminal.merchantId}|${terminal.id}|batch`,
    //         6,
    //         999999,
    //     );
    // }
}