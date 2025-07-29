import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AdminUserService } from './admin.user.service';
import { AdminUserDto } from './admin.user.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

@Controller('admin.user')
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Public()
  @Post()
  create(@Body() createAdminUserDto: AdminUserDto) {
    return this.adminUserService.addAdminUser(createAdminUserDto);
  }

  @Get()
  findAll() {
    return this.adminUserService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminUserService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdminUserDto: AdminUserDto) {
    return this.adminUserService.update(+id, updateAdminUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminUserService.remove(+id);
  }
}
