import { Module } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ServiceDao } from './service.dao';
import { DiscountModule } from '../discount/discount.module';

@Module({
  imports: [AppDbModule, BaseModule, DiscountModule],
  controllers: [ServiceController],
  providers: [ServiceService, ServiceDao],
  exports: [ServiceService],
})
export class ServiceModule {}
