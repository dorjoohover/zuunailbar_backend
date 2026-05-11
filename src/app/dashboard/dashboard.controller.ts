import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Admin } from 'src/auth/guards/role/role.decorator';

@ApiBearerAuth('access-token')
@Admin()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async list(
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('branch_id') branch_id?: string,
  ) {
    return await this.dashboardService.list({
      start_date,
      end_date,
      branch_id,
    });
  }
}
