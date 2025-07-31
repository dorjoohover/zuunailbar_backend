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
import { Admin } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';

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
    BadRequest.merchantNotFound(user.merchant);
    return this.categoryService.create(dto, user.merchant.id);
  }

  @Get()
  @PQ(['status'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.categoryService.findAll(pg, user.user.role);
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
