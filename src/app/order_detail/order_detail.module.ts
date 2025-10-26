import { Module } from '@nestjs/common';
import { OrderDetailService } from './order_detail.service';
import { OrderDetailController } from './order_detail.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { OrderDetailDao } from './order_detail.dao';
import { UserModule } from '../user/user.module';

@Module({
  imports: [AppDbModule, BaseModule, UserModule],
  controllers: [OrderDetailController],
  providers: [OrderDetailService, OrderDetailDao],
  exports: [OrderDetailService],
})
export class OrderDetailModule {}
