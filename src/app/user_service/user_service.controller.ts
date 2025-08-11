import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Req,
} from '@nestjs/common';
import { UserServiceService } from './user_service.service';
import { ApiBearerAuth, ApiHeader, ApiParam } from '@nestjs/swagger';
import { UserServiceDto } from './user_service.dto';
import { Admin, Employee, Manager } from 'src/auth/guards/role/role.decorator';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { CLIENT, EMPLOYEE } from 'src/base/constants';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { SAP } from 'src/common/decorator/use-param.decorator';
@ApiBearerAuth('access-token')
@Controller('user_service')
export class UserServiceController {
  constructor(private readonly userServiceService: UserServiceService) {}
  private static readonly clientFields = ['service_id', 'user_id'];
  private static readonly employeeFields = ['service_id', 'user_id', 'status'];
  @Employee()
  @Post()
  create(@Body() dto: UserServiceDto, @Req() { user }) {
    return this.userServiceService.create(dto, user.user);
  }

  @Public()
  @Get()
  @PQ(UserServiceController.clientFields)
  findAll(@Pagination() pg: PaginationDto) {
    return this.userServiceService.findForClient(pg);
  }
  @Employee()
  @Get('employee')
  @PQ(UserServiceController.employeeFields)
  find(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.userServiceService.findAll(pg, user.user.role);
  }

  @Get('get/:id')
  @SAP()
  findOne(@Param('id') id: string) {
    return this.userServiceService.findOne(id);
  }
  @Employee()
  @Patch(':id')
  @SAP()
  update(@Param('id') id: string, @Body() dto: UserServiceDto) {
    return this.userServiceService.update(id, dto);
  }

  @Admin()
  @Put(':id/:status')
  @SAP(['status'])
  remove(@Param('id') id: string, @Param('status') status: number) {
    return this.userServiceService.updateStatus(id, status);
  }
}
