import { Module } from '@nestjs/common';
import { ProductTransactionService } from './product_transaction.service';
import { ProductTransactionController } from './product_transaction.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ProductTransactionDao } from './product_transaction.dao';
import { ProductModule } from '../product/product.module';
import { ExcelService } from 'src/excel.service';

@Module({
  imports: [AppDbModule, BaseModule, ProductModule],
  controllers: [ProductTransactionController],
  providers: [ProductTransactionService, ProductTransactionDao, ExcelService],
  exports: [ProductTransactionService, ProductTransactionDao],
})
export class ProductTransactionModule {}
