import { Module } from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { MerchantController } from './merchant.controller';
import { BaseModule } from 'src/base/base.module';
import { AdminUserModule } from '../admin.user/admin.user.module';
import { MerchantDao } from './merchant.dao';
import { AppDbModule } from 'src/core/db/database.module';

@Module({
  imports: [
    AppDbModule,
    BaseModule,
    // SequenceModule,
    AdminUserModule,
  ],
  controllers: [MerchantController],
  providers: [MerchantDao, MerchantService],
  exports: [MerchantService],
})
export class MerchantModule {}
