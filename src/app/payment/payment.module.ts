import { forwardRef, Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { BaseModule } from 'src/base/base.module';
import { AppDbModule } from 'src/core/db/database.module';
import { OrderModule } from '../order/order.module';
import { OrderDetailModule } from '../order_detail/order_detail.module';
import { PaymentDao } from './payment.dao';
import { ExcelService } from 'src/excel.service';

@Module({
  imports: [
    AppDbModule,
    BaseModule,
    forwardRef(() => OrderModule),
    OrderDetailModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentDao, ExcelService],
  exports: [PaymentService],
})
export class PaymentModule {}
