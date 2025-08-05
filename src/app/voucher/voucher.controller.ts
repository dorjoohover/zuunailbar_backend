import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { VoucherService } from './voucher.service';
import { VoucherDto } from './voucher.dto';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { CLIENT } from 'src/base/constants';
import { Admin, Employee } from 'src/auth/guards/role/role.decorator';
import { SAP } from 'src/common/decorator/use-param.decorator';
@ApiBearerAuth('access-token')
// @ApiHeader({
//   name: 'branch-id',
//   description: 'Branch ID',
//   required: false,
// })
@Controller('voucher')
export class VoucherController {
  constructor(private readonly service: VoucherService) {}
  @Post()
  create(@Body() dto: VoucherDto) {
    return this.service.create(dto);
  }

  @Public()
  @Get()
  @PQ()
  findAll(@Pagination() pg: PaginationDto) {
    return this.service.findAll(pg, CLIENT);
  }
  @Employee()
  @Get('employee')
  @PQ()
  find(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.service.findAll(pg, user.user.role);
  }

  @Get('get/:id')
  @SAP()
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Employee()
  @Patch(':id')
  @SAP()
  update(@Param('id') id: string, @Body() dto: VoucherDto) {
    return this.service.update(id, dto);
  }

  @Admin()
  @Delete(':id/:status')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
