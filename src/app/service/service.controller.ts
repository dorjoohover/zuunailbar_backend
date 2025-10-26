import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Put,
  Query,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { ServiceDto } from './service.dto';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Admin, System } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { PQ, SQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Filter, Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { SAQ } from 'src/common/decorator/use-param.decorator';
import { CLIENT } from 'src/base/constants';

@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: false,
})
@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Admin()
  @Post()
  create(@Body() dto: ServiceDto, @Req() { user }) {
    BadRequest.merchantNotFound(user?.merchant, user.user.role);
    return this.serviceService.create(dto, user.merchant.id, user.user);
  }
  @PQ(['branch_id'])
  @Get()
  @Public()
  findAll(@Pagination() pg: PaginationDto) {
    return this.serviceService.findAll(pg, CLIENT);
  }
  @PQ(['branch_id', 'status'])
  @Get('admin')
  @System()
  find(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.serviceService.findAll(pg, user.user.role);
  }
  @Public()
  @Get('search')
  @SQ(['id', 'limit', 'page'])
  search(@Filter() sd: SearchDto) {
    return this.serviceService.search(sd, '3f86c0b23a5a4ef89a745269e7849640');
  }
  @Get('admin')
  @SAQ()
  findOne(@Query('id') id: string) {
    return this.serviceService.findOne(id);
  }

  @Admin()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ServiceDto, @Req() { user }) {
    BadRequest.merchantNotFound(user?.merchant, user.user.role);
    return this.serviceService.update(id, dto, user?.merchant?.id);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serviceService.remove(id);
  }
}
