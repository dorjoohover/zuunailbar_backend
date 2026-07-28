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
import { CostCategoryService } from './cost_category.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { CostCategoryDto } from './cost_category.dto';
import { Admin, Manager } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { PQ, SQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Filter, Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';

@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: false,
})
@Admin()
@Controller('cost_category')
export class CostCategoryController {
  constructor(private readonly costCategoryService: CostCategoryService) {}

  @Post()
  create(@Body() dto: CostCategoryDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.costCategoryService.create(dto, user.merchant.id);
  }

  @Get()
  @PQ(['name'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.costCategoryService.findAll(pg, user.user.role);
  }
  @Get('search')
  @Manager()
  @SQ(['id', 'limit', 'page'])
  async search(@Filter() sd: SearchDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    const res = await this.costCategoryService.search(sd, user.merchant.id);
    return res;
  }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CostCategoryDto) {
    return this.costCategoryService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.costCategoryService.remove(id);
  }
}
