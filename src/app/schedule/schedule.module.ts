import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ScheduleDao } from './schedule.dao';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [AppDbModule, BaseModule, OrderModule],
  controllers: [ScheduleController],
  providers: [ScheduleService, ScheduleDao],
  exports: [ScheduleService],
})
export class ScheduleModule {}
