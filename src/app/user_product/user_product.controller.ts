import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Put,
} from '@nestjs/common';
import { UserProductService } from './user_product.service';
import { ApiBearerAuth, ApiHeader, ApiParam } from '@nestjs/swagger';
import { UserProductDto, UserProductsDto } from './user_product.dto';
import { BadRequest } from 'src/common/error';
import { Employee, Manager } from 'src/auth/guards/role/role.decorator';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { SAP } from 'src/common/decorator/use-param.decorator';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { ADMIN, CLIENT, EMPLOYEE } from 'src/base/constants';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'branch-id',
  description: 'Branch ID',
  required: false,
})
@Controller('user_product')
export class UserProductController {
  private static fields = ['user_id', 'product_id', 'user_product_status'];
  constructor(private readonly userProductService: UserProductService) {}

  @Post()
  @Manager()
  create(@Body() dto: UserProductsDto, @Req() { user }) {
    BadRequest.branchNotFound(user.merchant, user.user.role);
    return this.userProductService.create(dto);
  }
  @Get()
  @PQ(UserProductController.fields)
  @Employee()
  find(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.userProductService.findAll(
      {
        ...pg,
        user_id: pg.user_id ?? (user.user.role > ADMIN ? user.user.id : null),
      },
      user.user.role,
    );
  }

  @Employee()
  @SAP()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userProductService.findOne(id);
  }
  @Manager()
  @SAP()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UserProductDto) {
    return this.userProductService.update(id, dto);
  }

  @Put(':id/:status')
  @Manager()
  @SAP(['status'])
  updateStatus(@Param('id') id: string, @Param() status: number) {
    return this.userProductService.updateUserProductStatus(id, status);
  }
  @Delete(':id')
  @SAP()
  remove(@Param('id') id: string) {
    return this.userProductService.updateStatus(id);
  }
}
