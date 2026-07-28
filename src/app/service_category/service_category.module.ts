import { Module } from '@nestjs/common';
import { ServiceCategoryService } from './service_category.service';
import { ServiceCategoryController } from './service_category.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ServiceCategoryDao } from './service_category.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [ServiceCategoryController],
  providers: [ServiceCategoryService, ServiceCategoryDao],
  exports: [ServiceCategoryService],
})
export class ServiceCategoryModule {}
