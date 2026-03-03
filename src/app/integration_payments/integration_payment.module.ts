import { Module } from '@nestjs/common';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ExcelService } from 'src/excel.service';
import { IntegrationPaymentController } from './integration_payment.controller';
import { IntegrationPaymentService } from './integration_payment.service';
import { IntegrationPaymentDao } from './integration_payment.dao';
import { UserModule } from '../user/user.module';
import { IntegrationModule } from '../integrations/integrations.module';
@Module({
  imports: [AppDbModule, BaseModule, IntegrationModule, UserModule],
  controllers: [IntegrationPaymentController],
  providers: [IntegrationPaymentService, IntegrationPaymentDao, ExcelService],
  exports: [IntegrationPaymentService],
})
export class IntegrationPaymentModule {}
