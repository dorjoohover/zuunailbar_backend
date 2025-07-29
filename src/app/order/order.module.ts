import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { OrdersDao } from './order.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [OrderController],
  providers: [OrderService, OrdersDao],
  exports: [OrderService],
})
export class OrderModule {}
