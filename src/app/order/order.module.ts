import { forwardRef, Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { OrdersDao } from './order.dao';
import { OrderDetailModule } from '../order_detail/order_detail.module';
import { ServiceModule } from '../service/service.module';
import { QpayService } from './qpay.service';
import { HttpModule } from '@nestjs/axios';
import { ExcelService } from 'src/excel.service';
import { UserModule } from '../user/user.module';
import { BookingModule } from '../booking/booking.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { AllExceptionsFilter } from 'src/core/utils/all-exceptions.filter';
import { FileErrorLogService } from 'src/error-log.service';
import { UserServiceModule } from '../user_service/user_service.module';
import { IntegrationModule } from '../integrations/integrations.module';
import { AvailabilitySlotsModule } from '../availability_slots/availability_slots.module';

@Module({
  imports: [
    AppDbModule,
    BaseModule,
    OrderDetailModule,
    ServiceModule,
    HttpModule,
    UserModule,
    BookingModule,
    IntegrationModule,
    UserServiceModule,
    AvailabilitySlotsModule,
    ScheduleModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrdersDao,
    QpayService,
    ExcelService,
    FileErrorLogService,
    AllExceptionsFilter,
  ],
  exports: [OrderService],
})
export class OrderModule {}
