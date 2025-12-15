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
import { PaymentService } from './payment.service';
import { PaymentDto } from './payment.dto';
import { PQ, SQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Filter, Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { BadRequest } from 'src/common/error';
import { Admin } from 'src/auth/guards/role/role.decorator';
import { CLIENT } from 'src/base/constants';
import { Response } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Post()
  create(@Body() dto: PaymentDto, @Req() { user }) {
    return this.service.create(dto, user.user.merchant);
  }
  @Get()
  @PQ(['status'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    let p = pg;

    return this.service.findAll(p, user.user.role);
  }

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
  update(@Param('id') id: string, @Body() dto: PaymentDto) {
    return this.service.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
