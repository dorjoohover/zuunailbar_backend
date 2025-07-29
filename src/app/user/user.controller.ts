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
import { ADMIN, MANAGER } from 'src/base/constants';

@ApiBearerAuth('access-token')
@Controller('user')
@ApiHeaders([
  {
    name: 'merchant-id',
    description: 'Merchant ID',
    required: true,
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
    BadRequest.merchantNotFound(user?.merchant);
    if (dto.role >= MANAGER) BadRequest.branchNotFound(user?.branch);

    return await this.userService.create(
      dto,
      user.merchant.id,
      user.user,
      user?.branch?.id,
    );
  }

  @Get()
  @PQ()
  findAll(@Pagination() pg: PaginationDto, @Req() { user }) {
    console.log(user);
    return this.userService.findAll(pg);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UserDto) {
    return this.userService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
