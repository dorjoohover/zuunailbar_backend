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
  Res,
  HttpStatus,
} from '@nestjs/common';
import { OrderService } from './order.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import {
  AvailableTimeDto,
  OrderDto,
  PaymentReportQueryDto,
  ReportFormat,
} from './order.dto';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { Admin, Employee } from 'src/auth/guards/role/role.decorator';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { Response } from 'express';
import { CLIENT } from 'src/base/constants';
import { BadRequest } from 'src/common/error';

const COLS: any[] = [
  { header: 'Date', key: 'date', width: 14 },
  { header: 'Method', key: 'method', width: 12 },
  { header: 'Orders', key: 'orders', width: 10 },
  { header: 'Amount', key: 'amount', width: 16 },
];
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: false,
})
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() dto: OrderDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.orderService.create(dto, user.user, user.merchant.id);
  }

  @Get()
  @PQ(['order_status', 'friend'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.orderService.find(pg, user.user.role, user.user.id);
  }
  @Admin()
  @Get('logs')
  @PQ([
    'new_status',
    'old_status',
    'order_id',
    'old_order_status',
    'new_order_status',
    'changed_by',
    'changed_at',
  ])
  findLogs(@Pagination() pg: PaginationDto) {
    return this.orderService.get_status_logs(pg);
  }

  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }
  // private async *reportRows(q: {
  //   from: Date;
  //   to: Date;
  //   method?: string;
  // }): AsyncGenerator {
  //   // ↓ Энд бодит aggregation / query-гээ хийнэ
  //   // for await (const r of stream) yield mapToPaymentRow(r);

  //   yield {
  //     date: '2025-08-01',
  //     method: q.method ?? 'card',
  //     orders: 12,
  //     amount: 1_500_000,
  //   };
  //   yield {
  //     date: '2025-08-02',
  //     method: q.method ?? 'card',
  //     orders: 18,
  //     amount: 2_100_000,
  //   };
  // }

  @Public()
  @Get('report')
  @PQ()
  async reports(
    @Pagination() pg: PaginationDto,
    @Req() { user },
    @Res() res: Response,
  ) {
    return await this.orderService.report(pg, CLIENT, res);
  }
  @Get('limit/:limit')
  // @Admin()
  @Public()
  @ApiParam({ name: 'limit' })
  async limit(@Param('limit') limit: number) {
    return this.orderService.updateOrderLimit(limit);
  }
  @Public()
  @Get('get-limit')
  async getLimit() {
    return this.orderService.getOrderLimit();
  }
  @Get('slots')
  @PQ(['artists', 'date', 'branch_id', 'parellel', 'artist_id'])
  findSlots(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.orderService.getSlots(pg);
  }
  @Public()
  @Get('public/slots')
  @PQ(['artists', 'date', 'branch_id', 'parellel', 'artist_id'])
  findPublicSlots(@Pagination() pg: PaginationDto) {
    return this.orderService.getSlots(pg);
  }

  @Get('user_count')
  async userCount(@Req() { user }) {
    return this.orderService.getUserCount(user.user.id);
  }
  @Employee()
  @Get('customer_count/:id')
  @ApiParam({ name: 'id' })
  async customerCount(@Param('id') id: string) {
    return this.orderService.getCustomerOrderCount(id);
  }
  @Get('confirm')
  @Admin()
  @PQ(['from', 'to'])
  async confirmOrders(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.orderService.confirmSalaryProcessStatus(
      user.user.id,
      pg.from,
      pg.to,
    );
  }
  @Get('confirm/:date')
  @Admin()
  @ApiParam({ name: 'date' })
  async confirmOrder(@Param('date') date: string, @Req() { user }) {
    return this.orderService.confirmSalaryProcessStatus(user.user.id, date);
  }

  @Get('check/:invoice/:id')
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'invoice' })
  async check(
    @Param('id') id: string,
    @Param('invoice') invoice: string,
    @Req() { user },
  ) {
    return this.orderService.checkPayment(
      invoice,
      id,
      user.user.id,
      user.user.role,
    );
  }
  @Get('cancel/:id')
  @ApiParam({ name: 'id' })
  async cancel(@Param('id') id: string, @Req() { user }) {
    return this.orderService.cancelOrder(id, user.user.id, user.user.role);
  }

  @Employee()
  @Patch('/update/:id')
  update(@Param('id') id: string, @Body() dto: OrderDto, @Req() { user }) {
    return this.orderService.update(
      id,
      dto,
      user.user.id,
      user.user.role,
      user?.merchant?.id,
    );
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
  updateStatus(
    @Param('id') id: string,
    @Param('status') status: string,
    @Req() { user },
  ) {
    return this.orderService.updateStatus({
      id,
      order_status: +status,
      user: user.user.id,
    });
  }
  @Admin()
  @Patch('level')
  updateLevel(@Body() dto: any) {
    return this.orderService.updateLevel(dto);
  }
  @Admin()
  @Get('level')
  async getLevel() {
    const items = await this.orderService.level();
    return {
      items,
    };
  }
  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string, @Req() { user }) {
    return this.orderService.remove({
      id,
      user: user.user.id,
    });
  }
  @Public()
  @Get('excel')
  excel() {
    // return this.orderService.excelAdd();
  }
}
