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
import { BookingDto } from './booking.dto';
import { Admin } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { CLIENT, ScheduleStatus } from 'src/base/constants';
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

  private static clientFields = [
    'branch_id',
    'index',
    'start_time',
    'end_time',
    'users',
  ];
  private static fields = [
    'user_id',
    'end_time',
    'index',
    'start_time',
    'booking_status',
    'status',
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

  @SAP()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: BookingDto) {
    return this.bookingService.update(id, dto);
  }

  @SAP()
  @Delete('id/:id')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(id);
  }
  @SAP()
  @Delete('index/:branch/:index')
  deleteByIndex(
    @Param('branch') branch: string,
    @Param('index') index: number,
  ) {
    return this.bookingService.removeByIndex(branch, index);
  }
}
