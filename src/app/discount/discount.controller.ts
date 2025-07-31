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
import { DiscountService } from './discount.service';
import { DiscountDto } from './discount.dto';
import { Admin } from 'src/auth/guards/role/role.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';

@ApiBearerAuth('access-token')
@Controller('discount')
@Admin()
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  @Post()
  create(@Body() dto: DiscountDto) {
    return this.discountService.create(dto);
  }

  @Get()
  @PQ(['status'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.discountService.findAll(pg, user.user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.discountService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: DiscountDto) {
    return this.discountService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.discountService.remove(id);
  }
}
