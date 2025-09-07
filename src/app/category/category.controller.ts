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
import { CategoryService } from './category.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { CategoryDto } from './category.dto';
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
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  create(@Body() dto: CategoryDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.categoryService.create(dto, user.merchant.id);
  }

  @Get()
  @PQ(['status'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.categoryService.findAll(pg, user.user.role);
  }
  @Get('search')
  @Manager()
  @SQ(['id', 'limit', 'page', 'type'])
  async search(@Filter() sd: SearchDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    const res = await this.categoryService.search(sd, user.merchant.id);
    return res;
  }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
