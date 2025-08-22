import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { OrdersDao } from './order.dao';
import { OrderDetailModule } from '../order_detail/order_detail.module';
import { ServiceModule } from '../service/service.module';
import { QpayService } from './qpay.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    AppDbModule,
    BaseModule,
    OrderDetailModule,
    ServiceModule,
    HttpModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, OrdersDao, QpayService],
  exports: [OrderService],
})
export class OrderModule {}
