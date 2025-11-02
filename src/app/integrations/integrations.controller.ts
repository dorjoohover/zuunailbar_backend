import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { IntegrationDto } from './integrations.dto';
import { Admin, Employee } from 'src/auth/guards/role/role.decorator';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { Cron } from '@nestjs/schedule';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { CLIENT } from 'src/base/constants';
import { Response } from 'express';
import { IntegrationService } from './integrations.service';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: true,
})
@Controller('integrations')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}
  @Admin()
  @Post()
  create(@Body() dto: IntegrationDto) {
    return this.integrationService.create(dto);
  }
  // zasna
  @PQ()
  @Get()
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.integrationService.findAll(pg, user.user.role);
  }
  @Employee()
  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.integrationService.findOne(id);
  }
  @Public()
  @Get('report')
  @PQ()
  async reports(
    @Pagination() pg: PaginationDto,
    @Req() { user },
    @Res() res: Response,
  ) {
    return await this.integrationService.report(pg, CLIENT, res);
  }

  @Admin()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: IntegrationDto) {
    return this.integrationService.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.integrationService.remove(id);
  }
}
