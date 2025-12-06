import { forwardRef, Module } from '@nestjs/common';
import { AvailabilitySlotsService } from './availability_slots.service';
import { AvailabilitySlotsController } from './availability_slots.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { AvailabilitySlotsDao } from './availability_slots.dao';
import { UserModule } from '../user/user.module';
import { BookingModule } from '../booking/booking.module';
import { ScheduleModule } from '../schedule/schedule.module';

@Module({
  imports: [
    AppDbModule,
    BaseModule,
    forwardRef(() => UserModule),
    ScheduleModule,
    BookingModule,
  ],
  controllers: [AvailabilitySlotsController],
  providers: [AvailabilitySlotsService, AvailabilitySlotsDao],
  exports: [AvailabilitySlotsService],
})
export class AvailabilitySlotsModule {}
