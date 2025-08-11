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
import { CostService } from './cost.service';
import { CostDto } from './cost.dto';
import { Admin } from 'src/auth/guards/role/role.decorator';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { BadRequest } from 'src/common/error';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { SAP } from 'src/common/decorator/use-param.decorator';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'branch-id',
  description: 'branch ID',
  required: false,
})
@Admin()
@Controller('cost')
export class CostController {
  constructor(private readonly costService: CostService) {}

  @Post()
  create(@Body() dto: CostDto, @Req() { user }) {
    BadRequest.branchNotFound(user.branch, user.user.role);
    return this.costService.create(dto, user.branch);
  }

  @PQ(['category_id', 'product_id', 'date', 'cost_status', 'branch_id'])
  @Get()
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.costService.findAll(pg, user.user.role);
  }

  @Get(':id')
  @SAP()
  findOne(@Param('id') id: string) {
    return this.costService.getById(id);
  }

  @SAP()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCostDto: CostDto) {
    return this.costService.update(id, updateCostDto);
  }

  @SAP()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.costService.remove(id);
  }
}
