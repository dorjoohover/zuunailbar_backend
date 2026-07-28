import { Module } from '@nestjs/common';
import { BaseModule } from 'src/base/base.module';
import { AppDbModule } from 'src/core/db/database.module';
import { VoucherController } from './voucher.controller';
import { VoucherService } from './voucher.service';
import { VoucherDao } from './voucher.dao';
import { ServiceModule } from '../service/service.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [AppDbModule, BaseModule, ServiceModule, UserModule],
  controllers: [VoucherController],
  providers: [VoucherService, VoucherDao],
  exports: [VoucherService],
})
export class VoucherModule {}
