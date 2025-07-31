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
import { OrderService } from './order.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OrderDto } from './order.dto';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { Admin, Employee } from 'src/auth/guards/role/role.decorator';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: true,
})
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() dto: OrderDto, @Req() { user }) {
    return this.orderService.create(dto, user.user.id);
  }

  @Get()
  @PQ()
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.orderService.find(pg, user.user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Employee()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: OrderDto) {
    return this.orderService.update(id, dto);
  }
  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(id);
  }
}
