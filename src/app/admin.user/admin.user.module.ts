import { Module } from '@nestjs/common';
import { AdminUserService } from './admin.user.service';
import { AdminUserController } from './admin.user.controller';
import { BaseModule } from 'src/base/base.module';
import { AdminUserDao } from './admin.user.dao';
import { AppDbModule } from 'src/core/db/database.module';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [AdminUserController],
  providers: [AdminUserService, AdminUserDao],
  exports: [AdminUserService],
})
export class AdminUserModule {}
