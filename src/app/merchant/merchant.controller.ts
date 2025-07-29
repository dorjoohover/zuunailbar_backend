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
  @PQ()
  @Public()
  findAll(@Pagination() pg: PaginationDto) {
    return this.merchantService.find(pg);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() { user }) {
    console.log(user);
    return this.merchantService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMerchantDto: MerchantDto) {
    return this.merchantService.update(+id, updateMerchantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.merchantService.remove(+id);
  }
}
