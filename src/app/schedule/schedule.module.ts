import { forwardRef, Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ScheduleDao } from './schedule.dao';
import { UserModule } from '../user/user.module';
import { ServiceModule } from '../service/service.module';

@Module({
  imports: [AppDbModule, BaseModule, forwardRef(() => UserModule), ServiceModule],
  controllers: [ScheduleController],
  providers: [ScheduleService, ScheduleDao],
  exports: [ScheduleService],
})
export class ScheduleModule {}
