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
import { AvailabilitySlotsService } from './availability_slots.service';
import { AvailabilitySlotDto } from './availability_slots.dto';
import { Admin } from 'src/auth/guards/role/role.decorator';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { Pagination } from 'src/common/decorator/pagination.decorator';

@Controller('slots')
export class AvailabilitySlotsController {
  constructor(private readonly service: AvailabilitySlotsService) {}
  @Admin()
  @Post()
  create(@Body() dto: AvailabilitySlotDto, @Req() { user }) {
    return this.service.create(dto, user.user.id);
  }
  @Admin()
  @Get()
  @PQ(['artists', 'date', 'branch_id', 'artist_id'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.service.findAll(pg);
  }

  @Admin()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: AvailabilitySlotDto) {
    return this.service.update(id, dto);
  }
}
