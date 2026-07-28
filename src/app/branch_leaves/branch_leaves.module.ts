import { Module } from '@nestjs/common';
import { BranchLeavesService } from './branch_leaves.service';
import { BranchLeavesController } from './branch_leaves.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { BranchLeavesDao } from './branch_leaves.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [BranchLeavesController],
  providers: [BranchLeavesService, BranchLeavesDao],
  exports: [BranchLeavesService],
})
export class BranchLeavesModule {}
