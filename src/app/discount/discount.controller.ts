import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  @Admin()
  @Post()
  create(@Body() dto: DiscountDto) {
    return this.discountService.create(dto);
  }

  @Get()
  @PQ()
  @Admin()
  findAll(@Pagination() pg: PaginationDto) {
    return this.discountService.findAll(pg);
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
