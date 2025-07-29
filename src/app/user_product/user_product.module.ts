import { Module } from '@nestjs/common';
import { UserProductService } from './user_product.service';
import { UserProductController } from './user_product.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { UserProductsDao } from './user_product.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [UserProductController],
  providers: [UserProductService, UserProductsDao],
  exports: [UserProductService],
})
export class UserProductModule {}
