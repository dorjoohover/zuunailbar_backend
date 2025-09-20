import { forwardRef, Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { BookingDao } from './booking.dao';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [AppDbModule, BaseModule, forwardRef(() => ScheduleModule)],
  controllers: [BookingController],
  providers: [BookingService, BookingDao],
  exports: [BookingService],
})
export class BookingModule {}
