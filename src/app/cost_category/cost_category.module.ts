import { Module } from '@nestjs/common';
import { CostCategoryService } from './cost_category.service';
import { CostCategoryController } from './cost_category.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { CostCategoryDao } from './cost_category.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [CostCategoryController],
  providers: [CostCategoryService, CostCategoryDao],
  exports: [CostCategoryService],
})
export class CostCategoryModule {}
