import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { UserDao } from './user.dao';
import { BranchModule } from '../branch/branch.module';
import { UserServiceModule } from '../user_service/user_service.module';
import { UserSalariesModule } from '../user_salaries/user_salaries.module';
import { DiscountModule } from '../discount/discount.module';
import { ServiceModule } from '../service/service.module';

@Module({
  imports: [
    AppDbModule,
    BaseModule,
    BranchModule,
    UserSalariesModule,
    DiscountModule,
    forwardRef(() => UserServiceModule),
    forwardRef(() => ServiceModule),
  ],
  controllers: [UserController],
  providers: [UserService, UserDao],
  exports: [UserService],
})
export class UserModule {}
