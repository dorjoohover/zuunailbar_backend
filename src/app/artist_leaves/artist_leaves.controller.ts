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
import { ArtistLeavesService } from './artist_leaves.service';
import { ArtistLeaveDto } from './artist_leaves.dto';
import { Admin } from 'src/auth/guards/role/role.decorator';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { Pagination } from 'src/common/decorator/pagination.decorator';

@Controller('artist_leaves')
export class ArtistLeavesController {
  constructor(private readonly service: ArtistLeavesService) {}
  @Admin()
  @Post()
  create(@Body() dto: ArtistLeaveDto, @Req() { user }) {
    return this.service.create(dto, user.user.id);
  }
  @Admin()
  @Get()
  @PQ(['date', 'artist_id'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.service.findAll(pg, user.user.role);
  }

  @Admin()
  @Patch('artist/:id')
  update(
    @Param('id') id: string,
    @Body() dto: ArtistLeaveDto,
    @Req() { user },
  ) {
    return this.service.removeByDate(id, user.user.id, dto.dates);
  }
}
