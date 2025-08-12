import { Module } from '@nestjs/common';
import { ProductLogService } from './product_log.service';
import { ProductLogController } from './product_log.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ProductLogDao } from './product_log.dao';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [AppDbModule, BaseModule, ProductModule],
  controllers: [ProductLogController],
  providers: [ProductLogService, ProductLogDao],
  exports: [ProductLogService],
})
export class ProductLogModule {}
