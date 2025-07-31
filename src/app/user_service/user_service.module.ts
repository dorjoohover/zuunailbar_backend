import { Module } from '@nestjs/common';
import { UserServiceService } from './user_service.service';
import { UserServiceController } from './user_service.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { UserServiceDao } from './user_service.dao';
import { ServiceModule } from '../service/service.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [AppDbModule, BaseModule, ServiceModule, UserModule],
  controllers: [UserServiceController],
  providers: [UserServiceService, UserServiceDao],
  exports: [UserServiceService],
})
export class UserServiceModule {}
