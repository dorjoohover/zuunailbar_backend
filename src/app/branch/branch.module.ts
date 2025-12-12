import { forwardRef, Module } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { BranchDao } from './branch.dao';
import { BranchServiceModule } from '../branch_service/branch_service.module';

@Module({
  imports: [AppDbModule, BaseModule, forwardRef(() => BranchServiceModule)],
  controllers: [BranchController],
  providers: [BranchService, BranchDao],
  exports: [BranchService],
})
export class BranchModule {}
