import { Module } from '@nestjs/common';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ExcelService } from 'src/excel.service';
import { UserModule } from '../user/user.module';
import { IntegrationController } from './integrations.controller';
import { IntegrationService } from './integrations.service';
import { IntegrationDao } from './integrations.dao';
import { IntegrationPaymentDao } from '../integration_payments/integration_payment.dao';

@Module({
  imports: [AppDbModule, BaseModule, UserModule],
  controllers: [IntegrationController],
  providers: [IntegrationService, IntegrationDao, IntegrationPaymentDao, ExcelService],
  exports: [IntegrationService],
})
export class IntegrationModule {}
