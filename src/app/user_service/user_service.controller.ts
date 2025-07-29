import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UserServiceService } from './user_service.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { UserServiceDto } from './user_service.dto';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: true,
})
@Controller('user-service')
export class UserServiceController {
  constructor(private readonly userServiceService: UserServiceService) {}

  @Post()
  create(@Body() dto: UserServiceDto) {
    return this.userServiceService.create(dto);
  }

  @Get()
  findAll() {
    return this.userServiceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userServiceService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UserServiceDto) {
    return this.userServiceService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userServiceService.remove(+id);
  }
}
