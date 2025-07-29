import { Module } from '@nestjs/common';
import { DiscountService } from './discount.service';
import { DiscountController } from './discount.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { DiscountDao } from './discount.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [DiscountController],
  providers: [DiscountService, DiscountDao],
  exports: [DiscountService],
})
export class DiscountModule {}
