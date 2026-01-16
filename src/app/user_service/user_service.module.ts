import { forwardRef, Module } from '@nestjs/common';
import { UserServiceService } from './user_service.service';
import { UserServiceController } from './user_service.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { UserServiceDao } from './user_service.dao';
import { UserModule } from '../user/user.module';
import { ServiceModule } from '../service/service.module';

@Module({
  imports: [
    AppDbModule,
    BaseModule,
    forwardRef(() => UserModule),
    forwardRef(() => ServiceModule),
  ],
  controllers: [UserServiceController],
  providers: [UserServiceService, UserServiceDao],
  exports: [UserServiceService],
})
export class UserServiceModule {}
