import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Req,
} from '@nestjs/common';
import { UserSalariesService } from './user_salaries.service';
import { UserSalaryDto } from './user_salaries.dto';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Employee, Manager } from 'src/auth/guards/role/role.decorator';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { ADMIN } from 'src/base/constants';
import { SAP } from 'src/common/decorator/use-param.decorator';

@Controller('user_salaries')
export class UserSalariesController {
  constructor(private readonly userSalariesService: UserSalariesService) {}
  private static fields = ['user_id', 'status', 'percent', 'duration', 'date'];
  @Post()
  create(@Body() dto: UserSalaryDto) {
    return this.userSalariesService.create(dto);
  }

  @Get()
  @PQ(UserSalariesController.fields)
  @Employee()
  find(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.userSalariesService.findAll(
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
    return this.userSalariesService.findOne(id);
  }
  @Manager()
  @SAP()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UserSalaryDto) {
    return this.userSalariesService.update(id, dto);
  }

  @Put(':id/:status')
  @Manager()
  @SAP(['status'])
  updateStatus(@Param('id') id: string, @Param() status: number) {
    return this.userSalariesService.updateUserSalaryStatus(id, status);
  }
  @Delete(':id')
  @SAP()
  remove(@Param('id') id: string) {
    return this.userSalariesService.updateStatus(id);
  }
}
