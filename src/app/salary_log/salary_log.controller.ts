import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SalaryLogService } from './salary_log.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { SalaryLogDto } from './salary_log.dto';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: true,
})
@Controller('salary-log')
export class SalaryLogController {
  constructor(private readonly salaryLogService: SalaryLogService) {}

  @Post()
  create(@Body() dto: SalaryLogDto) {
    return this.salaryLogService.create(dto);
  }

  @Get()
  findAll() {
    return this.salaryLogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salaryLogService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: SalaryLogDto) {
    return this.salaryLogService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salaryLogService.remove(+id);
  }
}
