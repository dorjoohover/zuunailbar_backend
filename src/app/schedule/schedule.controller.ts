import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ScheduleDto } from './schedule.dto';
import { Employee } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { CLIENT, ScheduleStatus } from 'src/base/constants';
import { SAP } from 'src/common/decorator/use-param.decorator';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'branch-id',
  description: 'Branch ID',
  required: false,
})
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}
  private static clientFields = ['user_id', 'branch_id', 'date', 'time'];
  private static fields = [
    'user_id',
    'branch_id',
    'date',
    'time',
    'schedule_status',
    'status',
  ];
  @Employee()
  @Post()
  create(@Body() dto: ScheduleDto, @Req() { user }) {
    if (!dto.branch_id)
      BadRequest.branchNotFound(dto.branch_id ?? user.branch, user.user.role);
    return this.scheduleService.create(
      dto,
      dto.branch_id ?? user.branch.id,
      user.user.id,
    );
  }

  @Get()
  @Public()
  @PQ(ScheduleController.clientFields)
  findAll(@Pagination() pg: PaginationDto) {
    return this.scheduleService.findAll(
      {
        ...pg,
        schedule_status: ScheduleStatus.Active,
      },
      CLIENT,
    );
  }
  @Get('employee')
  @PQ(ScheduleController.fields)
  find(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.scheduleService.findAll(pg, user.user);
  }

  @SAP()
  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @SAP()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(id);
  }
}
