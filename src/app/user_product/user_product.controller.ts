import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UserProductService } from './user_product.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { UserProductDto } from './user_product.dto';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: true,
})
@Controller('user-product')
export class UserProductController {
  constructor(private readonly userProductService: UserProductService) {}

  @Post()
  create(@Body() dto: UserProductDto) {
    return this.userProductService.create(dto);
  }

  @Get()
  findAll() {
    return this.userProductService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userProductService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UserProductDto) {
    return this.userProductService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userProductService.remove(+id);
  }
}
