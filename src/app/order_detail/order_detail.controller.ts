import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { OrderDetailService } from './order_detail.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OrderDetailDto } from './order_detail.dto';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: true,
})
@Controller('order-detail')
export class OrderDetailController {
  constructor(private readonly orderDetailService: OrderDetailService) {}

  @Post()
  create(@Body() dto: OrderDetailDto) {
    return this.orderDetailService.create(dto);
  }

  @Get()
  findAll() {
    return this.orderDetailService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderDetailService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: OrderDetailDto) {
    return this.orderDetailService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderDetailService.remove(+id);
  }
}
