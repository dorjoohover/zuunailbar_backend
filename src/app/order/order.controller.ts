import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { ApiBearerAuth, ApiHeader, ApiParam } from '@nestjs/swagger';
import { OrderDto } from './order.dto';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { Admin, Employee } from 'src/auth/guards/role/role.decorator';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
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
  @Patch('/update/:id')
  update(@Param('id') id: string, @Body() dto: OrderDto) {
    return this.orderService.update(id, dto);
  }

  @Public()
  @Get('callback/:order/:user')
  @ApiParam({ name: 'order' })
  async handleCallback(
    @Query('qpay_payment_id') id: string,
    @Param('order') order: string,
    @Param('user') user: string,
  ): Promise<any> {
    const res = await this.orderService.checkCallback(user, id, order);

    return res;
  }
  @Employee()
  @Patch('status/:id/:status')
  updateStatus(@Param('id') id: string, @Param('status') status: string) {
    return this.orderService.updateStatus(id, +status);
  }
  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(id);
  }
}
