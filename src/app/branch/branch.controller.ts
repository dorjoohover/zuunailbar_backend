import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { BranchDto } from './branch.dto';
import { Admin } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'merchant-id',
  description: 'Merchant ID',
  required: true,
})
@Controller('branch')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Admin()
  @Post()
  async create(@Body() dto: BranchDto, @Req() { user }) {
    BadRequest.merchantNotFound(user.merchant);
    return await this.branchService.create(dto, user.merchant.id);
  }

  @Get()
  findAll() {
    return this.branchService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: BranchDto) {
    return this.branchService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.branchService.remove(id);
  }
}
