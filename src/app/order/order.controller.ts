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
import { ReportService } from 'src/report.service';
import { Response } from 'express';

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
    private report: ReportService,
  ) {}

  @Post()
  create(@Body() dto: OrderDto, @Req() { user }) {
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
  private async *reportRows(q: {
    from: Date;
    to: Date;
    method?: string;
  }): AsyncGenerator {
    // ↓ Энд бодит aggregation / query-гээ хийнэ
    // for await (const r of stream) yield mapToPaymentRow(r);

    yield {
      date: '2025-08-01',
      method: q.method ?? 'card',
      orders: 12,
      amount: 1_500_000,
    };
    yield {
      date: '2025-08-02',
      method: q.method ?? 'card',
      orders: 18,
      amount: 2_100_000,
    };
  }

  @Public()
  @Get('report')
  @ApiOperation({ summary: 'Payments report татах (CSV/XLSX)' })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  )
  @ApiOkResponse({
    description: 'File download (CSV/XLSX)',
    // Swagger UI-д “Download file” товч гаргахаар binary schema заана.
    schema: { type: 'string', format: 'binary' },
  })
  @ApiBadRequestResponse({ description: 'from/to дутуу' })
  async reports(@Query() q: PaymentReportQueryDto, @Res() res: Response) {
    if (!q.from || !q.to) {
      return res.status(HttpStatus.BAD_REQUEST).send('from/to заавал');
    }

    const rows = this.reportRows({
      from: new Date(q.from),
      to: new Date(q.to),
      method: q.method,
    });

    const fname = `payments_${q.from}_${q.to}.${q.format ?? ReportFormat.XLSX}`;
    if (q.format === ReportFormat.CSV) {
      return this.report.csvFromIterable(res, fname, COLS, rows);
    }
    return this.report.xlsxFromIterable(res, fname, COLS, rows, {
      sheetName: 'Payments',
      moneyKeys: ['amount'],
    });
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
