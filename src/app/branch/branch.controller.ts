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
import { BranchService } from './branch.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { BranchDto } from './branch.dto';
import { Admin, Manager } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { PQ, SQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Filter, Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { CLIENT } from 'src/base/constants';
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
    return await this.branchService.create(dto, user.merchant.id, user.user);
  }
  @Public()
  @Get()
  @PQ(['status'])
  findAll(@Pagination() pg: PaginationDto) {
    return this.branchService.find(pg, CLIENT);
  }
  @Get('search')
  @Manager()
  @SQ(['id', 'limit', 'page'])
  search(@Filter() sd: SearchDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant, user.user.role);
    return this.branchService.search(sd, user.merchant.id);
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
