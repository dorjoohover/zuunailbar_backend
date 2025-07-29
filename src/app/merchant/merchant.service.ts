import { Injectable } from '@nestjs/common';
import { MerchantDao } from './merchant.dao';
import { MerchantDto } from './merchant.dto';
import { BaseService } from 'src/base/base.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AppUtils } from 'src/core/utils/app.utils';
import { PaginationDto } from 'src/common/decorator/pagination.dto';

@ApiBearerAuth('access-token')
@Injectable()
export class MerchantService extends BaseService {
  constructor(
    private dao: MerchantDao,

    // private feedService: FeedService,
    // private sequenceService: SequenceService,
  ) {
    super();
  }
  public async create(dto: MerchantDto) {
    return await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
    });
  }
  async get(id: string) {
    const merchant = await this.dao.getById(id);

    return { ...merchant };
  }

  public async find(pg: PaginationDto) {
    return await this.dao.list(pg);
  }

  findOne(id: number) {
    return `This action returns a #${id} merchant`;
  }

  update(id: number, updateMerchantDto: MerchantDto) {
    return `This action updates a #${id} merchant`;
  }

  remove(id: number) {
    return `This action removes a #${id} merchant`;
  }
}
