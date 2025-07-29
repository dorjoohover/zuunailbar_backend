import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ProductDao } from './product.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [ProductController],
  providers: [ProductService, ProductDao],
  exports: [ProductService],
})
export class ProductModule {}
