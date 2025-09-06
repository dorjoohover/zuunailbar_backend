import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  Res,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductDto } from './product.dto';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Admin } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { PQ, SQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Filter, Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { SAQ } from 'src/common/decorator/use-param.decorator';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { Response } from 'express';
import { CLIENT } from 'src/base/constants';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: false,
})
@Controller('product')
export class ProductController {
  private static spending = '6ed8d41219c1499a80c7267095461af2';
  constructor(private readonly productService: ProductService) {}
  @Admin()
  @Post()
  create(@Body() dto: ProductDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.productService.create(dto, user.merchant.id);
  }

  @Get()
  @PQ(['status'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    let p = pg;

    return this.productService.findAll(p, user.user.role);
  }

  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }
  @Get('search')
  @SQ(['id', 'limit', 'page'])
  serach(@Filter() sd: SearchDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.productService.search(sd, user.merchant.id);
  }
  @Public()
  @Get('report')
  @PQ()
  async reports(
    @Pagination() pg: PaginationDto,
    @Req() { user },
    @Res() res: Response,
  ) {
    return await this.productService.report(pg, CLIENT, res);
  }
  @Admin()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ProductDto) {
    return this.productService.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
