import { Module } from '@nestjs/common';
import { SalaryLogService } from './salary_log.service';
import { SalaryLogController } from './salary_log.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { SalaryLogDao } from './salary_log.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [SalaryLogController],
  providers: [SalaryLogService, SalaryLogDao],
  exports: [SalaryLogService],
})
export class SalaryLogModule {}
