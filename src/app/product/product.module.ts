import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ProductDao } from './product.dao';
import { CategoryModule } from '../category/category.module';
import { BrandModule } from '../brand/brand.module';
import { ExcelService } from 'src/excel.service';

@Module({
  imports: [AppDbModule, BaseModule, CategoryModule, BrandModule],
  controllers: [ProductController],
  providers: [ProductService, ProductDao, ExcelService],
  exports: [ProductService],
})
export class ProductModule {}
