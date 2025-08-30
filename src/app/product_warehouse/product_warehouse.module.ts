import { Module } from '@nestjs/common';
import { ProductWarehouseService } from './product_warehouse.service';
import { ProductWarehouseController } from './product_warehouse.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ProductModule } from '../product/product.module';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { ProductWarehouseDao } from './product_warehouse.dao';
import { ExcelService } from 'src/excel.service';

@Module({
  imports: [AppDbModule, BaseModule, ProductModule, WarehouseModule],
  controllers: [ProductWarehouseController],
  providers: [ProductWarehouseService, ProductWarehouseDao, ExcelService],
  exports: [ProductWarehouseService],
})
export class ProductWarehouseModule {}
