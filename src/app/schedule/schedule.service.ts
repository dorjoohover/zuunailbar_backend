import { Injectable } from '@nestjs/common';
import { ScheduleDao } from './schedule.dao';
import { ScheduleDto } from './schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly dao: ScheduleDao) {}
  public async create(dto: ScheduleDto) {
    return 'This action adds a new schedule';
  }

  findAll() {
    return `This action returns all schedule`;
  }

  findOne(id: number) {
    return `This action returns a #${id} schedule`;
  }

  update(id: number, dto: ScheduleDto) {
    return `This action updates a #${id} schedule`;
  }

  remove(id: number) {
    return `This action removes a #${id} schedule`;
  }
}
