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
import { BrandService } from './brand.service';

import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { BrandDto } from './brand.dto';
import { Admin, Manager } from 'src/auth/guards/role/role.decorator';
import { PQ, SQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Filter, Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { BadRequest } from 'src/common/error';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: false,
})
@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Manager()
  @Post()
  create(@Body() dto: BrandDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.brandService.create(dto, user.merchant.id);
  }
  @Manager()
  @Get()
  @PQ(['status'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.brandService.findAll(pg, user.user.role);
  }
  @Get('search')
  @Manager()
  @SQ(['id', 'limit', 'page'])
  search(@Filter() sd: SearchDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.brandService.search(sd, user.merchant.id);
  }

  @Manager()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: BrandDto) {
    return this.brandService.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.brandService.remove(id);
  }
}
