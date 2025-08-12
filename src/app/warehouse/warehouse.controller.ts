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
import { WarehouseService } from './warehouse.service';
import { Warehouse } from './warehouse.entity';
import { Admin, Manager } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { WarehouseDto } from './warehouse.dto';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: false,
})
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Admin()
  @Post()
  @Post()
  create(@Body() dto: WarehouseDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.warehouseService.create(dto, user.merchant.id);
  }
  @Manager()
  @Get()
  @PQ(['status'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.warehouseService.findAll(pg, user.user.role);
  }

  @Manager()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: WarehouseDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.warehouseService.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.warehouseService.remove(id);
  }
}
