import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProductTransactionService } from './product_transaction.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ProductTransactionDto } from './product_transaction.dto';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: true,
})
@Controller('product-transaction')
export class ProductTransactionController {
  constructor(
    private readonly productTransactionService: ProductTransactionService,
  ) {}

  @Post()
  create(@Body() dto: ProductTransactionDto) {
    return this.productTransactionService.create(dto);
  }

  @Get()
  findAll() {
    return this.productTransactionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productTransactionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ProductTransactionDto) {
    return this.productTransactionService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productTransactionService.remove(+id);
  }
}
