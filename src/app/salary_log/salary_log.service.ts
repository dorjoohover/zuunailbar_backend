import { Injectable } from '@nestjs/common';
import { SalaryLogDao } from './salary_log.dao';
import { SalaryLogDto } from './salary_log.dto';

@Injectable()
export class SalaryLogService {
  constructor(private readonly dao: SalaryLogDao) {}
  public async create(dto: SalaryLogDto) {
    return 'This action adds a new salaryLog';
  }

  findAll() {
    return `This action returns all salaryLog`;
  }

  findOne(id: number) {
    return `This action returns a #${id} salaryLog`;
  }

  update(id: number, updateSalaryLogDto: SalaryLogDto) {
    return `This action updates a #${id} salaryLog`;
  }

  remove(id: number) {
    return `This action removes a #${id} salaryLog`;
  }
}
