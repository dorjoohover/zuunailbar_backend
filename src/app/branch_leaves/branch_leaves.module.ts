import { Module } from '@nestjs/common';
import { BranchLeavesService } from './branch_leaves.service';
import { BranchLeavesController } from './branch_leaves.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { BranchLeavesDao } from './branch_leaves.dao';
import { AvailabilitySlotsModule } from '../availability_slots/availability_slots.module';

@Module({
  imports: [AppDbModule, BaseModule, AvailabilitySlotsModule],
  controllers: [BranchLeavesController],
  providers: [BranchLeavesService, BranchLeavesDao],
  exports: [BranchLeavesService],
})
export class BranchLeavesModule {}
