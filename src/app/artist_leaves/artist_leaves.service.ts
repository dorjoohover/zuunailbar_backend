import { Injectable } from '@nestjs/common';
import { ArtistLeaveDto } from './artist_leaves.dto';
import { ArtistLeavesDao } from './artist_leaves.dao';
import {
  CLIENT,
  EmployeeStatus,
  getDatesBetween,
  getDefinedKeys,
} from 'src/base/constants';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { AppUtils } from 'src/core/utils/app.utils';

@Injectable()
export class ArtistLeavesService {
  constructor(private dao: ArtistLeavesDao) {}
  public async create(dto: ArtistLeaveDto, user: string) {
    const { dates, ...body } = dto;
    return await Promise.all(
      dates.map(async (date) => {
        const leave = await this.dao.getByDateAndArtist(body.artist_id, date);
        if (leave) {
          if (leave.status == body.status) return leave.id;
          return await this.updateByArtist(body.artist_id, dto, user);
        }
        return await this.dao.add({
          ...body,
          date,
          id: AppUtils.uuid4(),
          created_by: user,
        });
      }),
    );
  }

  public async getById(id: string) {
    return await this.dao.getById(id);
  }
  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }
  public async updateByArtist(id: string, dto: ArtistLeaveDto, user: string) {
    const { dates, artist_id, ...body } = dto;

    return await Promise.all(
      dates.map(async (date) => {
        return await this.dao.updateByDate(
          { ...body, date },
          getDefinedKeys({ ...body, date }),
        );
      }),
    );
  }

  public async removeByDate(artist: string, user: string, dates?: Date[]) {
    const res = await this.dao.deleteByArtist(artist, dates);

    return res;
  }
  public async remove(id: string) {
    return await this.dao.deleteOne(id);
  }
}
