import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Employee } from 'src/auth/guards/role/role.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { VoucherConfigDto, VoucherDto } from './voucher.dto';
import { VoucherService } from './voucher.service';

@ApiBearerAuth('access-token')
@Controller('voucher')
export class VoucherController {
  constructor(private readonly service: VoucherService) {}

  @Employee()
  @Post()
  create(@Body() dto: VoucherDto, @Req() { user }) {
    return this.service.create(dto, user?.user?.id);
  }

  @Get()
  @PQ(['voucher_status', 'level', 'type'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.service.findAll(
      pg,
      user.user.role,
      user.user.role >= 50 ? user.user.id : undefined,
    );
  }

  @Get('my')
  @PQ(['voucher_status', 'level', 'type'])
  my(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.service.findAll(pg, user.user.role, user.user.id);
  }

  @Employee()
  @Get('available/:userId')
  @PQ(['order_id'])
  available(@Param('userId') userId: string, @Pagination() pg: PaginationDto) {
    return this.service.available(userId, pg?.order_id);
  }

  @Employee()
  @Get('config')
  config() {
    return this.service.config();
  }

  @Employee()
  @Patch('config')
  updateConfig(@Body() dto: VoucherConfigDto) {
    return this.service.updateConfig(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Employee()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: VoucherDto) {
    return this.service.update(id, dto);
  }

  @Employee()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
