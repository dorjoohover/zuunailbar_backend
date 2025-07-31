import { Module } from '@nestjs/common';
import { CostService } from './cost.service';
import { CostController } from './cost.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { CostDao } from './cost.dao';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [AppDbModule, BaseModule, ProductModule],
  controllers: [CostController],
  providers: [CostService, CostDao],
  exports: [CostService],
})
export class CostModule {}
