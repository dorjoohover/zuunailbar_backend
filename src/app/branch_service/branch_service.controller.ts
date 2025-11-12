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
import { BranchServiceService } from './branch_service.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BranchServiceDto } from './branch_service.dto';
import { Admin, Employee } from 'src/auth/guards/role/role.decorator';
import { STATUS } from 'src/base/constants';
import { SAP } from 'src/common/decorator/use-param.decorator';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
@ApiBearerAuth('access-token')
@Controller('branch_service')
export class BranchServiceController {
  constructor(private readonly branchServiceService: BranchServiceService) {}
  private static readonly clientFields = ['service_id', 'user_id'];
  private static readonly employeeFields = ['service_id', 'user_id', 'status'];
  @Employee()
  @Post()
  create(@Body() dto: BranchServiceDto, @Req() { user }) {
    return this.branchServiceService.create(dto, user.user);
  }

  @Get()
  @Public()
  @PQ(['order_status', 'friend'])
  findAll(@Pagination() pg: PaginationDto) {
    return this.branchServiceService.findAll(pg);
  }

  @Get('get/:id')
  @SAP()
  findOne(@Param('id') id: string) {
    return this.branchServiceService.findOne(id);
  }
  @Employee()
  @Patch(':id')
  @SAP()
  update(@Param('id') id: string, @Body() dto: BranchServiceDto) {
    return this.branchServiceService.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.branchServiceService.updateStatus(id, STATUS.Hidden);
  }
}
