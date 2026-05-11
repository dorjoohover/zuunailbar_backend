import { Module } from '@nestjs/common';
import { CostService } from './cost.service';
import { CostController } from './cost.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { CostDao } from './cost.dao';
import { CostCategoryModule } from '../cost_category/cost_category.module';

@Module({
  imports: [AppDbModule, BaseModule, CostCategoryModule],
  controllers: [CostController],
  providers: [CostService, CostDao],
  exports: [CostService, CostDao],
})
export class CostModule {}
