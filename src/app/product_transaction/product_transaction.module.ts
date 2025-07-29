import { Module } from '@nestjs/common';
import { ProductTransactionService } from './product_transaction.service';
import { ProductTransactionController } from './product_transaction.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ProductTransactionDao } from './product_transaction.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [ProductTransactionController],
  providers: [ProductTransactionService, ProductTransactionDao],
  exports: [ProductTransactionService],
})
export class ProductTransactionModule {}
