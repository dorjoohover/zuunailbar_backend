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
import { MerchantService } from './merchant.service';
import { MerchantDto } from './merchant.dto';
import { Admin, System } from 'src/auth/guards/role/role.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';
import { P, Q } from 'src/common/const/app.const';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { SAP } from 'src/common/decorator/use-param.decorator';

@ApiBearerAuth('access-token')
@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @System()
  @Post()
  create(@Body() dto: MerchantDto) {
    return this.merchantService.create(dto);
  }

  @Get()
  @PQ(['status'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.merchantService.find(pg, user.user.role);
  }

  @Get(':id')
  @SAP()
  findOne(@Param('id') id: string) {
    return this.merchantService.findOne(id);
  }

  @System()
  @Patch(':id')
  @SAP()
  update(@Param('id') id: string, @Body() updateMerchantDto: MerchantDto) {
    return this.merchantService.update(id, updateMerchantDto);
  }

  @Delete(':id')
  @System()
  @SAP()
  remove(@Param('id') id: string) {
    return this.merchantService.remove(id);
  }
}
