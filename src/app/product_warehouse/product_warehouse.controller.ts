import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Res,
} from '@nestjs/common';
import { ProductWarehouseService } from './product_warehouse.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import {
  ProductsWarehouseDto,
  ProductWarehouseDto,
} from './product_warehouse.dto';
import { Admin, Employee, Manager } from 'src/auth/guards/role/role.decorator';
import { PQ, SQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Filter, Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { Response } from 'express';
import { CLIENT } from 'src/base/constants';
import { BadRequest } from 'src/common/error';
@ApiBearerAuth('access-token')
@Controller('product_warehouse')
export class ProductWarehouseController {
  constructor(
    private readonly productWarehouseService: ProductWarehouseService,
  ) {}
  @Manager()
  @Post()
  create(@Body() dto: ProductsWarehouseDto, @Req() { user }) {
    return this.productWarehouseService.create(dto, user.user.id);
  }

  @Get()
  @Employee()
  @PQ(['warehouse_id', 'product_id'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.productWarehouseService.findAll({ ...pg }, user.user.role);
  }
  @Get('search')
  @SQ(['id', 'limit', 'page', 'type', 'warehouse_id'])
  search(@Filter() sd: SearchDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.productWarehouseService.search(sd, user.merchant.id);
  }

  @Employee()
  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.productWarehouseService.findOne(id);
  }
  @Public()
  @Get('report')
  @PQ()
  async reports(
    @Pagination() pg: PaginationDto,
    @Req() { user },
    @Res() res: Response,
  ) {
    return await this.productWarehouseService.report(pg, CLIENT, res);
  }

  @Manager()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ProductsWarehouseDto) {
    return this.productWarehouseService.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productWarehouseService.remove(id);
  }
}
