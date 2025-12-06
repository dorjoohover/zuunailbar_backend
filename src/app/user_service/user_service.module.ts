import { forwardRef, Module } from '@nestjs/common';
import { UserServiceService } from './user_service.service';
import { UserServiceController } from './user_service.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { UserServiceDao } from './user_service.dao';
import { UserModule } from '../user/user.module';
import { AvailabilitySlotsModule } from '../availability_slots/availability_slots.module';
import { ServiceModule } from '../service/service.module';

@Module({
  imports: [
    AppDbModule,
    BaseModule,
    forwardRef(() => UserModule),
    forwardRef(() => ServiceModule),
    forwardRef(() => AvailabilitySlotsModule),
  ],
  controllers: [UserServiceController],
  providers: [UserServiceService, UserServiceDao],
  exports: [UserServiceService],
})
export class UserServiceModule {}
