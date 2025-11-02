import { Module } from '@nestjs/common';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ExcelService } from 'src/excel.service';
import { UserModule } from '../user/user.module';
import { IntegrationController } from './integrations.controller';
import { IntegrationService } from './integrations.service';
import { IntegrationDao } from './integrations.dao';

@Module({
  imports: [AppDbModule, BaseModule, UserModule],
  controllers: [IntegrationController],
  providers: [IntegrationService, IntegrationDao, ExcelService],
  exports: [IntegrationService],
})
export class IntegrationModule {}
