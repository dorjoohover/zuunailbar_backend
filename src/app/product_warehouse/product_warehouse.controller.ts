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
import { ProductWarehouseService } from './product_warehouse.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import {
  ProductsWarehouseDto,
  ProductWarehouseDto,
} from './product_warehouse.dto';
import { Admin, Employee, Manager } from 'src/auth/guards/role/role.decorator';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
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
  @Employee()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productWarehouseService.findOne(id);
  }

  @Manager()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ProductWarehouseDto) {
    return this.productWarehouseService.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productWarehouseService.remove(id);
  }
}
