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
import { OrderDetailService } from './order_detail.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OrderDetailDto } from './order_detail.dto';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { SAP } from 'src/common/decorator/use-param.decorator';
import { Manager } from 'src/auth/guards/role/role.decorator';
@ApiBearerAuth('access-token')
@Controller('order_detail')
export class OrderDetailController {
  constructor(private readonly orderDetailService: OrderDetailService) {}

  @Post()
  create(@Body() dto: OrderDetailDto) {
    return this.orderDetailService.create(dto);
  }

  @Get()
  @PQ()
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.orderDetailService.find(pg, user.user.role);
  }
  @SAP()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderDetailService.findOne(id);
  }
  @Manager()
  @Patch(':id')
  @SAP()
  update(@Param('id') id: string, @Body() dto: OrderDetailDto) {
    return this.orderDetailService.update(id, dto);
  }

  @SAP()
  @Manager()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderDetailService.remove(id);
  }
}
