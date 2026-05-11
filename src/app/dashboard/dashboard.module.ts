import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DashboardDao } from './dashboard.dao';
import { AppDbModule } from 'src/core/db/database.module';
import { BaseModule } from 'src/base/base.module';

@Module({
  imports: [AppDbModule, BaseModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardDao],
  exports: [DashboardService],
})
export class DashboardModule {}
