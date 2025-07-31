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
import { ProductTransactionService } from './product_transaction.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ProductTransactionDto } from './product_transaction.dto';
import { Admin, Employee, Manager } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { PRODUCT_TRANSACTION_STATUS } from 'src/base/constants';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'branch-id',
  description: 'Branch ID',
  required: false,
})
@Controller('product_transaction')
export class ProductTransactionController {
  constructor(
    private readonly productTransactionService: ProductTransactionService,
  ) {}

  @Manager()
  @Post()
  create(@Body() dto: ProductTransactionDto, @Req() { user }) {
    BadRequest.branchNotFound(user.branch);
    return this.productTransactionService.create(
      dto,
      user.branch.id,
      user.user.id,
    );
  }

  @Get()
  @Employee()
  @PQ(['user_id', 'product_id', 'branch_id'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.productTransactionService.findAll(
      { ...pg, transaction_status: PRODUCT_TRANSACTION_STATUS.Used },
      user.user.role,
    );
  }
  @Get('admin')
  @Manager()
  @PQ(['user_id', 'product_id', 'branch_id', 'status', 'transaction_status'])
  find(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.productTransactionService.findAll(pg, user.user.role);
  }

  @Employee()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productTransactionService.findOne(id);
  }

  @Manager()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ProductTransactionDto) {
    return this.productTransactionService.update(id, dto);
  }

  @Admin()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productTransactionService.remove(id);
  }
}
