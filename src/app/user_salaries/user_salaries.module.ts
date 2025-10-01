import { Module } from '@nestjs/common';
import { UserSalariesService } from './user_salaries.service';
import { UserSalariesController } from './user_salaries.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { UserModule } from '../user/user.module';
import { UserSalariesDao } from './user_salaries.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [UserSalariesController],
  providers: [UserSalariesService, UserSalariesDao],
  exports: [UserSalariesService],
})
export class UserSalariesModule {}
