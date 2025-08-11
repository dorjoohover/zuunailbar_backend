import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { BranchDto } from './branch.dto';
import { Admin } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: true,
})
@Controller('branch')
@Admin()
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  async create(@Body() dto: BranchDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return await this.branchService.create(dto, user.merchant.id);
  }

  @Get()
  @PQ(['status'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.branchService.find(pg, user.user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: BranchDto) {
    return this.branchService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.branchService.remove(id);
  }
}
