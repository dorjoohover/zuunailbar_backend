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
import { BookingService } from './booking.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { BookingDto, BookingWeekDto, SetBranchLeaveDto } from './booking.dto';
import { Admin } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { ADMIN, ADMINUSERS } from 'src/base/constants';
import { SAP } from 'src/common/decorator/use-param.decorator';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: false,
})
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}
  private canManageFinishTime(role?: number) {
    return role === ADMIN || role === ADMINUSERS;
  }

  private static clientFields = [
    'branch_id',
    'index',
    'date',
    'start_time',
    'end_time',
    'users',
  ];
  private static fields = [
    'user_id',
    'end_time',
    'index',
    'date',
    'start_time',
    'booking_status',
    'status',
    'is_generated',
  ];
  @Admin()
  @Post()
  create(@Body() dto: BookingDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.bookingService.create(dto, user.merchant.id, user.user.id);
  }

  @Get('employee')
  @PQ(BookingController.fields)
  find(@Pagination() pg: PaginationDto, @Req() { user }) {
    const res = this.bookingService.findAll(pg, user.user.role);
    return res;
  }

  @SAP()
  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  /**
   * Салбарт бүтэн долоо хоногийн (эсвэл дурын хэдэн өдрийн) цагийг нэг дор
   * тавина. Хоосон үлдсэн ирээдүйн долоо хоногууд автоматаар өмнөх долоо
   * хоногоос хуулагдана (ensureAvailabilityWindow).
   */
  @Admin()
  @Post('week')
  setWeek(@Body() dto: BookingWeekDto, @Req() { user }) {
    return this.bookingService.setWeek(dto, user.user.id, user.merchant?.id);
  }

  @Admin()
  @Get('week/:branch/:weekStart')
  getWeek(
    @Param('branch') branch: string,
    @Param('weekStart') weekStart: string,
  ) {
    return this.bookingService.getWeek(branch, weekStart);
  }

  /**
   * app_config.availability_days цонхыг гар аргаар шинэчлэх. Үгүй бол шөнө
   * дундын cron (TasksService) үүнийг өдөр бүр автоматаар хийнэ.
   */
  @Admin()
  @Post('generate')
  generate() {
    return this.bookingService.ensureAvailabilityWindow();
  }

  /**
   * Тусдаа "Салбарын амралт" хуудасны зориулалттай жагсаалт (хуучин `GET
   * /branch_leaves`-ийн оронд).
   */
  @Admin()
  @Get('leave')
  @PQ(['branch_id', 'date', 'date_from', 'date_to'])
  findLeaves(@Pagination() pg: PaginationDto) {
    return this.bookingService.findLeaves(pg);
  }

  /**
   * Салбарт нэг эсвэл хэд хэдэн өдөр амралт (хаалттай өдөр) тавина (хуучин
   * `POST /branch_leaves`-ийн оронд). Хадгалсан даруйд availability window
   * шууд дахин тооцоологдоно.
   */
  @Admin()
  @Post('leave')
  setLeave(@Body() dto: SetBranchLeaveDto, @Req() { user }) {
    return this.bookingService.setLeave(dto, user.user.id);
  }

  @Admin()
  @Delete('leave/:branch/:date')
  clearLeave(
    @Param('branch') branch: string,
    @Param('date') date: string,
    @Req() { user },
  ) {
    return this.bookingService.clearLeave(branch, [date], user.user.id);
  }

  @SAP()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: BookingDto, @Req() { user }) {
    return this.bookingService.update(id, {
      ...dto,
      finish_time: this.canManageFinishTime(user.user.role)
        ? dto.finish_time
        : undefined,
    });
  }

  /** Legacy: индекс (0-6) дээр суурилсан бүх мөрийг устгана. */
  @SAP()
  @Delete('index/:branch/:index')
  deleteByIndex(
    @Param('branch') branch: string,
    @Param('index') index: number,
  ) {
    return this.bookingService.removeByIndex(branch, index);
  }

  @SAP()
  @Delete('date/:branch/:date')
  deleteByDate(@Param('branch') branch: string, @Param('date') date: string) {
    return this.bookingService.removeByDate(branch, date);
  }
}
