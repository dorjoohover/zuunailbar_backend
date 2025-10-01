import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { UserDao } from './user.dao';
import { BranchModule } from '../branch/branch.module';
import { UserServiceModule } from '../user_service/user_service.module';
import { UserServiceService } from '../user_service/user_service.service';
import { UserServiceDao } from '../user_service/user_service.dao';
import { ServiceService } from '../service/service.service';
import { ServiceDao } from '../service/service.dao';
import { DiscountService } from '../discount/discount.service';
import { DiscountDao } from '../discount/discount.dao';
import { UserSalariesModule } from '../user_salaries/user_salaries.module';

@Module({
  imports: [AppDbModule, BaseModule, BranchModule, UserSalariesModule],
  controllers: [UserController],
  providers: [
    UserService,
    UserDao,
    UserServiceService,
    UserServiceDao,
    ServiceService,
    ServiceDao,
    DiscountService,
    DiscountDao,
  ],
  exports: [UserService],
})
export class UserModule {}
