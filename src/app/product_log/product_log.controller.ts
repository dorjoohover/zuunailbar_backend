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
import { ProductLogService } from './product_log.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ProductLogDto } from './product_log.dto';
import { BadRequest } from 'src/common/error';
import { Admin } from 'src/auth/guards/role/role.decorator';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { ADMINUSERS } from 'src/base/constants';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: false,
})
@Admin()
@Controller('product_log')
export class ProductLogController {
  constructor(private readonly productLogService: ProductLogService) {}
  @Post()
  create(@Body() dto: ProductLogDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.productLogService.create(dto, user.merchant.id, user.user.id);
  }

  @Get()
  @PQ(['created_by', 'product_id', 'start_date', 'end_date'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.productLogService.findAll(
      {
        ...pg,
        merchant_id: user.user.role != ADMINUSERS ? user.merchant.id : null,
      },
      user.user.role,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productLogService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ProductLogDto) {
    return this.productLogService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productLogService.remove(id);
  }
}
