import { Module } from '@nestjs/common';
import { CostService } from './cost.service';
import { CostController } from './cost.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { CostDao } from './cost.dao';
import { CostCategoryModule } from '../cost_category/cost_category.module';
import { ExcelService } from 'src/excel.service';

@Module({
  imports: [AppDbModule, BaseModule, CostCategoryModule],
  controllers: [CostController],
  providers: [CostService, CostDao, ExcelService],
  exports: [CostService, CostDao],
})
export class CostModule {}
