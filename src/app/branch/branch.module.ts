import { Module } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';
import { BranchDao } from './branch.dao';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [BranchController],
  providers: [BranchService, BranchDao],
  exports: [BranchService],
})
export class BranchModule {}
