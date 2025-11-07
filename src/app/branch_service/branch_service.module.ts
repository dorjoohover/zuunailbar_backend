import { forwardRef, Module } from '@nestjs/common';
import { BranchServiceService } from './branch_service.service';
import { BranchServiceController } from './branch_service.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { BranchServiceDao } from './branch_service.dao';
import { ServiceModule } from '../service/service.module';
import { BranchModule } from '../branch/branch.module';

@Module({
  imports: [
    AppDbModule,
    BaseModule,
    forwardRef(() => ServiceModule),
    BranchModule,
  ],
  controllers: [BranchServiceController],
  providers: [BranchServiceService, BranchServiceDao],
  exports: [BranchServiceService],
})
export class BranchServiceModule {}
