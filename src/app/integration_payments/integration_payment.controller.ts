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
import { Admin, Employee } from 'src/auth/guards/role/role.decorator';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { Cron } from '@nestjs/schedule';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { CLIENT } from 'src/base/constants';
import { Response } from 'express';
import { IntegrationPaymentDto } from './integration_payment.dto';
import { IntegrationPaymentService } from './integration_payment.service';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: true,
})
@Controller('integration_payment')
export class IntegrationPaymentController {
  constructor(private readonly service: IntegrationPaymentService) {}
  @Admin()
  @Post()
  create(@Body() dto: IntegrationPaymentDto) {
    return this.service.create(dto);
  }
  // zasna
  @PQ()
  @Get()
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.service.findAll(pg, user.user.role);
  }
  @Employee()
  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
  @Public()
  @Get('report')
  @PQ()
  async reports(
    @Pagination() pg: PaginationDto,
    @Req() { user },
    @Res() res: Response,
  ) {
    return await this.service.report(pg, CLIENT, res);
  }

  @Admin()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: IntegrationPaymentDto) {
    return this.service.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
