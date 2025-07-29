import { Module } from "@nestjs/common";
import { AppDbModule } from "src/core/db/database.module";
import { SequenceService } from "./sequence.service";
import { SequenceDao } from "./sequence.dao";

@Module({
    imports: [AppDbModule],
    providers: [SequenceDao, SequenceService],
    exports: [SequenceService],
})
export class SequenceModule {}