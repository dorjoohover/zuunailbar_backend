import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { UserDao } from './user.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [UserController],
  providers: [UserService, UserDao],
  exports: [UserService],
})
export class UserModule {}
