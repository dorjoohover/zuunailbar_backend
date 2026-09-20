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
import { ScheduleService } from './schedule.service';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ScheduleDto, ScheduleWeekDto, SetLeaveDto } from './schedule.dto';
import { Admin, Employee, Manager } from 'src/auth/guards/role/role.decorator';
import { BadRequest } from 'src/common/error';
import { PQ } from 'src/common/decorator/use-pagination-query.decorator';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { Pagination } from 'src/common/decorator/pagination.decorator';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { ADMIN, ADMINUSERS, CLIENT, ScheduleStatus } from 'src/base/constants';
import { SAP } from 'src/common/decorator/use-param.decorator';
@ApiBearerAuth('access-token')
@ApiHeader({
  name: 'branch-id',
  description: 'Branch ID',
  required: false,
})
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}
  private canManageFinishTime(role?: number) {
    return role === ADMIN || role === ADMINUSERS;
  }
  private static clientFields = ['user_id', 'branch_id', 'date', 'time'];
  private static fields = [
    'user_id',
    'branch_id',
    'date',
    'time',
    'schedule_status',
    'status',
  ];
  @Employee()
  @Post()
  create(@Body() dto: ScheduleDto, @Req() { user }) {
    return this.scheduleService.create(
      {
        ...dto,
        finish_time: this.canManageFinishTime(user.user.role)
          ? dto.finish_time
          : undefined,
      },
      user.user.id,
    );
  }

  @Get()
  @Public()
  @PQ(ScheduleController.clientFields)
  findAll(@Pagination() pg: PaginationDto) {
    return this.scheduleService.findAll(
      {
        ...pg,
        schedule_status: ScheduleStatus.Active,
      },
      CLIENT,
    );
  }
  @Get('employee')
  @PQ(ScheduleController.fields)
  find(@Pagination() pg: PaginationDto, @Req() { user }) {
    return this.scheduleService.findAll(pg, user.user);
  }

  @SAP()
  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Get('search')
  @PQ(ScheduleController.fields)
  @Employee()
  search(@Pagination() pg: PaginationDto) {
    return this.scheduleService.search(pg);
  }

  /**
   * Артистад бүтэн долоо хоногийн (эсвэл дурын хэдэн өдрийн) хуваарийг нэг
   * дор тавина. Хоосон үлдсэн ирээдүйн долоо хоногууд автоматаар өмнөх
   * долоо хоногоос хуулагдана (ensureAvailabilityWindow).
   */
  @Employee()
  @Post('week')
  setWeek(@Body() dto: ScheduleWeekDto, @Req() { user }) {
    return this.scheduleService.setWeek(dto, user.user.id);
  }

  @Employee()
  @Get('week/:user/:weekStart')
  getWeek(@Param('user') user: string, @Param('weekStart') weekStart: string) {
    return this.scheduleService.getWeek(user, weekStart);
  }

  /**
   * app_config.availability_days цонхыг гар аргаар шинэчлэх (жишээ нь
   * availability_days утга солигдсоны дараа шууд effect авахуулах бол).
   * Үгүй бол шөнө дундын cron (TasksService) үүнийг өдөр бүр автоматаар хийнэ.
   */
  @Admin()
  @Post('generate')
  generate() {
    return this.scheduleService.ensureAvailabilityWindow();
  }
  @SAP()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ScheduleDto, @Req() { user }) {
    return this.scheduleService.update(id, {
      ...dto,
      finish_time: this.canManageFinishTime(user.user.role)
        ? dto.finish_time
        : undefined,
    });
  }

  @SAP()
  @Delete('date/:user/:date')
  deleteByDate(@Param('user') user: string, @Param('date') date: string) {
    return this.scheduleService.removeByDate(user, date);
  }

  /**
   * Тусдаа "Ажилтны амралт" хуудасны зориулалттай жагсаалт (хуучин `GET
   * /artist_leaves`-ийн оронд).
   */
  @Admin()
  @Get('leave')
  @PQ(['user_id', 'date', 'date_from', 'date_to'])
  findLeaves(@Pagination() pg: PaginationDto) {
    return this.scheduleService.findLeaves(pg);
  }

  /**
   * Артистад нэг эсвэл хэд хэдэн өдөр амралт тавина (хуучин `POST
   * /artist_leaves`-ийн оронд). Хадгалсан даруйд availability window шууд
   * дахин тооцоологдоно — тусад нь "generate" дуудах шаардлагагүй.
   */
  @Employee()
  @Post('leave')
  setLeave(@Body() dto: SetLeaveDto, @Req() { user }) {
    return this.scheduleService.setLeave(dto, user.user.id);
  }

  @SAP()
  @Delete('leave/:user/:date')
  clearLeave(
    @Param('user') user: string,
    @Param('date') date: string,
    @Req() { user: reqUser },
  ) {
    return this.scheduleService.clearLeave(user, [date], reqUser.user.id);
  }
}
