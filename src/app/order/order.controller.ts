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
import { OrderDto, PaymentReportQueryDto, ReportFormat } from './order.dto';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { Admin, Employee } from 'src/auth/guards/role/role.decorator';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { ExcelService } from 'src/excel.service';
import { Response } from 'express';
import { CLIENT } from 'src/base/constants';

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
  constructor(
    private readonly orderService: OrderService,
    private excel: ExcelService,
  ) {}

  @Post()
  create(@Body() dto: OrderDto, @Req() { user }) {
    console.log(user.user);
    return this.orderService.create(dto, user.user.id);
  }

  @Get()
  @PQ()
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.orderService.find(pg, user.user.role);
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
