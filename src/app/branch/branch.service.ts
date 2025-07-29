import { Injectable } from '@nestjs/common';
import { BranchDto } from './branch.dto';
import { BranchDao } from './branch.dao';
import { AppUtils } from 'src/core/utils/app.utils';

@Injectable()
export class BranchService {
  constructor(private readonly dao: BranchDao) {}
  public async create(dto: BranchDto, merchant: string) {
  
    const res = await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      merchant_id: merchant,
      user_id: null,
    });
    return res;
  }
  async get(id: string) {
    return await this.dao.getById(id);
  }

  findAll() {
    return `This action returns all branch`;
  }

  findOne(id: string) {
    return `This action returns a #${id} branch`;
  }

  update(id: string, dto: BranchDto) {
    return `This action updates a #${id} branch`;
  }

  remove(id: string) {
    return `This action removes a #${id} branch`;
  }
}
