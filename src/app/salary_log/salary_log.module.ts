import { Module } from '@nestjs/common';
import { SalaryLogService } from './salary_log.service';
import { SalaryLogController } from './salary_log.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { SalaryLogDao } from './salary_log.dao';
import { ExcelService } from 'src/excel.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [AppDbModule, BaseModule, UserModule],
  controllers: [SalaryLogController],
  providers: [SalaryLogService, SalaryLogDao, ExcelService],
  exports: [SalaryLogService],
})
export class SalaryLogModule {}
