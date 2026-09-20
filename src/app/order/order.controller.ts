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
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpException,
} from '@nestjs/common';
import { OrderService } from './order.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiSecurity,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AvailableTimeDto,
  OrderByPhoneDto,
  OrderDto,
  PaymentReportQueryDto,
  ReportFormat,
} from './order.dto';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { Admin, Employee } from 'src/auth/guards/role/role.decorator';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { ChatbotAuthGuard } from 'src/auth/guards/chatbot/chatbot-auth.guard';
import { Response } from 'express';
import { CLIENT } from 'src/base/constants';
import { BadRequest } from 'src/common/error';
import { memoryStorage } from 'multer';
import { UserService } from '../user/user.service';
import { BranchService } from '../branch/branch.service';
import { MobileFormat } from 'src/common/formatter';

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
    private readonly userService: UserService,
    private readonly branchService: BranchService,
  ) {}

  @Post()
  create(@Body() dto: OrderDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    if (user.user.role >= CLIENT) {
      dto.customer_id = user.user.id;
    }
    return this.orderService.create(dto, user.user, user.merchant.id);
  }

  @Employee()
  @Post('by-phone')
  async createByPhone(@Body() dto: OrderByPhoneDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    const customer = await this.userService.findMobileByMerchant(
      MobileFormat(dto.mobile),
      user.merchant.id,
    );
    if (!customer) {
      throw new HttpException('Харилцагч олдсонгүй.', HttpStatus.NOT_FOUND);
    }
    dto.customer_id = customer.id;
    return this.orderService.create(dto, user.user, user.merchant.id);
  }

  // Chatbot-д зориулсан, JWT token шаардахгүй захиалга үүсгэх endpoint.
  // Зөвхөн ChatbotAuthGuard-аар (x-bot-key header) баталгаажина. Хэрэглэгчийг
  // зөвхөн утасны дугаараар олж/шинээр үүсгэж, тухайн хэрэглэгчийг захиалга
  // үүсгэгч (CLIENT) болгож ашиглана — энэ нь client өөрөө шууд захиалга
  // үүсгэх үеийн (@Post() create()) логиктой ижил.
  @ApiOperation({
    summary: 'Chatbot-с (JWT token шаардахгүй) утасны дугаараар захиалга үүсгэх',
    description:
      'Зөвхөн x-bot-key (эсвэл x-chatbot-key) header дэх нууц түлхүүрээр баталгаажина. Хэрэглэгчийг утасны дугаараар олж/шинээр бүртгэнэ.',
  })
  @ApiSecurity('bot-key')
  @ApiHeader({
    name: 'x-bot-key',
    description:
      'Chatbot API key (.env-ийн CHATBOT_API_KEY-тэй тохирох ёстой). x-chatbot-key нэрээр мөн дамжуулж болно.',
    required: true,
  })
  @Public()
  @UseGuards(ChatbotAuthGuard)
  @Post('chatbot')
  async createFromChatbot(@Body() dto: OrderByPhoneDto) {
    if (!dto.mobile) {
      throw new HttpException(
        'Утасны дугаар шаардлагатай.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!dto.branch_id) {
      throw new HttpException('Салбар сонгоно уу.', HttpStatus.BAD_REQUEST);
    }

    const branch = await this.branchService.findOne(dto.branch_id);
    if (!branch) {
      throw new HttpException('Салбар олдсонгүй.', HttpStatus.NOT_FOUND);
    }
    const merchantId = branch.merchant_id;
    const mobile = MobileFormat(dto.mobile);

    let customer = await this.userService.findMobileByMerchant(
      mobile,
      merchantId,
    );
    if (!customer) {
      await this.userService.register(
        {
          mobile,
          password: mobile,
        } as any,
        merchantId,
      );
      customer = await this.userService.findMobileByMerchant(
        mobile,
        merchantId,
      );
    }
    if (!customer) {
      throw new HttpException(
        'Хэрэглэгч үүсгэхэд алдаа гарлаа.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    dto.customer_id = customer.id;
    return this.orderService.create(
      dto,
      { ...customer, role: CLIENT } as any,
      merchantId,
    );
  }

  @Admin()
  @Post('import/xlsx')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx)',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  importXlsxCalendar(
    @UploadedFile() file: Express.Multer.File,
    @Req() { user },
  ) {
    return this.orderService.importCalendarXlsx(file, user.user);
  }

  @Get()
  @PQ([
    'date',
    'end_date',
    'order_status',
    'user_id',
    'branch_id',
    'customer',
    'friend',
    'channel',
  ])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.orderService.find(pg, user.user.role, user.user.id);
  }

  @Get('channel')
  @PQ([
    'channel',
    'date',
    'end_date',
    'order_status',
    'user_id',
    'branch_id',
    'customer',
    'friend',
  ])
  findByChannel(@Pagination() pg: PaginationDto, @Req() { user }) {
    if (!pg.channel) {
      throw new HttpException(
        'channel параметр шаардлагатай.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.orderService.findByChannel(pg, user.user.role, user.user.id);
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

  @Get('report')
  @PQ([
    'date',
    'end_date',
    'order_status',
    'user_id',
    'branch_id',
    'customer',
    'friend',
    'channel',
  ])
  async reports(
    @Pagination() pg: PaginationDto,
    @Req() { user },
    @Res() res: Response,
  ) {
    return await this.orderService.report(pg, user.user.role, res);
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
  @PQ([
    'artists',
    'date',
    'branch_id',
    'parellel',
    'artist_id',
    'multi_artist_queue',
  ])
  findSlots(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.orderService.getSlots(pg);
  }
  @Public()
  @Get('public/slots')
  @PQ([
    'artists',
    'date',
    'branch_id',
    'parellel',
    'artist_id',
    'multi_artist_queue',
  ])
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
  @Post('confirm')
  @Admin()
  @PQ(['from', 'to'])
  async confirmOrders(
    @Body() body: { from?: string; to?: string },
    @Req() { user },
  ) {
    return this.orderService.confirmSalaryProcessStatus(
      user.user.id,
      body?.from,
      body?.to,
    );
  }

  @Post('dashboard/backfill')
  @Admin()
  async backfillDashboard(
    @Body() body: { start_date?: string; end_date?: string },
    @Req() { user },
  ) {
    return this.orderService.backfillDashboardSnapshots({
      start_date: body?.start_date,
      end_date: body?.end_date,
      approver: user.user.id,
    });
  }
  @Post('confirm/:date')
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
  @Get('payment/:id')
  @ApiParam({ name: 'id' })
  async payment(@Param('id') id: string, @Req() { user }) {
    return this.orderService.getPaymentInvoice(
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
