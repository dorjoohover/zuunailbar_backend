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
import { SalaryLogService } from './salary_log.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { SalaryLogDto } from './salary_log.dto';
import { Admin, Employee } from 'src/auth/guards/role/role.decorator';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: true,
})
@Controller('salary-log')
export class SalaryLogController {
  constructor(private readonly salaryLogService: SalaryLogService) {}
  @Admin()
  @Post()
  create(@Body() dto: SalaryLogDto) {
    return this.salaryLogService.create(dto);
  }
  // zasna
  @PQ()
  @Get()
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.salaryLogService.findAll(pg, user.user.role);
  }
  @Employee()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salaryLogService.findOne(id);
  }

  @Admin()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: SalaryLogDto) {
    return this.salaryLogService.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salaryLogService.remove(id);
  }
}
