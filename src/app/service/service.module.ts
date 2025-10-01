import { Module } from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { ServiceDao } from './service.dao';
import { DiscountModule } from '../discount/discount.module';
import { UserServiceService } from '../user_service/user_service.service';
import { UserServiceDao } from '../user_service/user_service.dao';
import { UserService } from '../user/user.service';
import { UserDao } from '../user/user.dao';
import { BranchService } from '../branch/branch.service';
import { BranchDao } from '../branch/branch.dao';
import { UserSalariesModule } from '../user_salaries/user_salaries.module';

@Module({
  imports: [AppDbModule, BaseModule, DiscountModule, UserSalariesModule],
  controllers: [ServiceController],
  providers: [
    ServiceService,
    ServiceDao,
    UserServiceService,
    UserServiceService,
    UserServiceDao,
    UserService,
    UserDao,
    BranchService,
    BranchDao,
  ],
  exports: [ServiceService],
})
export class ServiceModule {}
