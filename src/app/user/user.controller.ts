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
import { UserService } from './user.service';
import { ApiBearerAuth, ApiHeader, ApiHeaders } from '@nestjs/swagger';
import { UserDto } from './user.dto';
import { Manager } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { ADMIN, CLIENT, MANAGER } from 'src/base/constants';
import { SAP, SAQ } from 'src/common/decorator/use-param.decorator';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

@ApiBearerAuth('access-token')
@Controller('user')
@ApiHeaders([
  {
    name: 'merchant-id',
    description: 'Merchant ID',
    required: false,
  },
  {
    name: 'branch-id',
    description: 'Branch ID',
    required: false,
  },
])
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Manager()
  async create(@Body() dto: UserDto, @Req() { user }) {
    BadRequest.merchantNotFound(user?.merchant, user.user.role);
    if (dto.role >= MANAGER && dto.role < CLIENT)
      BadRequest.branchNotFound(user?.branch, user.user.role);

    return await this.userService.create(
      dto,
      user.merchant.id,
      user.user,
      user?.branch?.id,
    );
  }

  @Get()
  @PQ(['role'])
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.userService.findAll(pg, user.user.role);
  }
  @Public()
  @Get('client')
  @PQ(['role'])
  findUser(@Pagination() pg: PaginationDto) {
    return this.userService.findAll(
      {
        role: 35,
        ...pg,
      },
      CLIENT,
    );
  }

  @SAP()
  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
  @Get('me')
  findMe(@Req() { user }) {
    return user;
  }
  @SAP(['device'])
  @Get('device/:device')
  findDevice(@Param('device') device: string) {
    return this.userService.findDevice(device);
  }

  @SAP()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @SAP()
  remove(@Param('id') id: string) {
    return this.userService.updateStatus(id);
  }
}
