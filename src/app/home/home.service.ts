import { Injectable } from '@nestjs/common';
import { HomeDao } from './home.dao';
import { FeatureDto, FeaturesDto, HomeDto, HomesDto } from './home.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { CLIENT, getDefinedKeys, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class HomeService {
  constructor(private readonly dao: HomeDao) {}
  public async create(item: HomeDto) {
    let home;
    try {
      home = await this.dao.getHomeByIndex(item.index);
    } catch (error) {
      home = null;
    }
    home
      ? await this.update(home.id, item)
      : await this.dao.add({
          artist_name: item.artist_name,
          name: item.name,
          image: item.image,
          index: item.index,
          id: AppUtils.uuid4(),
          status: STATUS.Active,
        });
  }
  public async createFeature(item: FeatureDto) {
    let feature;
    try {
      feature = await this.dao.getFeatureByIndex(item.index);
    } catch (error) {
      feature = null;
    }
    if (feature) {
      await this.updateFeature(feature.id, {
        description: item.description,
        icon: item.icon,
        index: item.index,
        title: item.title,
      });
      return;
    }
    await this.dao.addFeature({
      description: item.description,
      icon: item.icon,
      index: item.index,
      title: item.title,
      id: AppUtils.uuid4(),
      status: STATUS.Active,
    });
  }

  public async findAll(dto: PaginationDto) {
    const res = await this.dao.list(applyDefaultStatusFilter(dto, CLIENT));
    const items = res.items.sort((a, b) => a.index - b.index);
    return {
      count: res.count,
      items,
    };
  }
  public async findFeature(dto: PaginationDto) {
    return await this.dao.listFeature(applyDefaultStatusFilter(dto, CLIENT));
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: HomeDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }
  public async updateFeature(id: string, dto: FeatureDto) {
    return await this.dao.updateFeature({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
  public async removeFeature(id: string) {
    return await this.dao.updateStatusFeature(id, STATUS.Hidden);
  }
}
