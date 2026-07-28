import { forwardRef, Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { UserDao } from './user.dao';
import { BranchModule } from '../branch/branch.module';
import { UserServiceModule } from '../user_service/user_service.module';
import { UserSalariesModule } from '../user_salaries/user_salaries.module';
import { UserService } from './user.service';
import { ExcelService } from 'src/excel.service';

@Module({
  imports: [
    AppDbModule,
    BaseModule,
    forwardRef(() => UserSalariesModule),
    forwardRef(() => UserServiceModule),
    forwardRef(() => BranchModule),
  ],
  controllers: [UserController],
  providers: [UserService, UserDao, ExcelService],
  exports: [UserService],
})
export class UserModule {}
