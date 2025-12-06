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
import { BranchLeavesService } from './branch_leaves.service';
import { BranchLeaveDto } from './branch_leaves.dto';
import { Admin } from 'src/auth/guards/role/role.decorator';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { Pagination } from 'src/common/decorator/pagination.decorator';

@Controller('branch_leaves')
export class BranchLeavesController {
  constructor(private readonly service: BranchLeavesService) {}
  @Admin()
  @Post()
  create(@Body() dto: BranchLeaveDto, @Req() { user }) {
    return this.service.create(dto, user.user.id);
  }
  @Admin()
  @Get()
  @PQ(['start_date', 'end_date', 'branch_id'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.service.findAll(pg, user.user.role);
  }

  @Admin()
  @Patch('branch/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: BranchLeaveDto,
    @Req() { user },
  ) {
    const res = await this.service.removeByDate(id, user.user.id, dto.dates);
    return res;
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string, @Req() { user }) {
    return this.service.removeByDate(id, user.user.id);
  }
}
