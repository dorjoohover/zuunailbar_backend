import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BranchServiceDao } from './branch_service.dao';
import { BranchServiceDto } from './branch_service.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { CLIENT, getDefinedKeys, mnDate, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { User } from '../user/user.entity';
import { ServiceService } from '../service/service.service';
import { BranchService } from '../branch/branch.service';
import { BadRequest } from 'src/common/error';

@Injectable()
export class BranchServiceService {
  constructor(
    private readonly dao: BranchServiceDao,
    @Inject(forwardRef(() => ServiceService))
    private service: ServiceService,
    @Inject(forwardRef(() => BranchService))
    private branchService: BranchService,
  ) {}
  public async create(dto: BranchServiceDto, u: User) {
    try {
      const service = await this.service.findOne(dto.service_id);
      if (!service) throw new BadRequest().notFound('Үйлчилгээ');
      const branch = await this.branchService.findOne(dto.branch_id);
      if (!branch) throw new BadRequest().notFound('Салбар');
      const meta = {
        branchName: branch.name,
        serviceName: service.name,
        description: service.description ?? '',
        categoryName: service.meta?.name,
      };
      const res = await this.dao.add({
        id: AppUtils.uuid4(),
        ...dto,
        index: service.index,
        meta,
        created_by: u.id,
      });
      return res;
    } catch (error) {
      console.log(error);
    }
  }

  public async updateByService(branch: string) {
    const { items } = await this.service.findAll({}, CLIENT);
    await Promise.all(
      items.map(async (service) => {
        this.updateByServiceAndBranch({
          meta: {
            serviceName: service.name,
            description: service.description ?? '',
            categoryName: service.meta?.name,
            branchName: '',
          },
          index: service.index,
          branch_id: branch,
          service_id: service.id,
          min_price: service.min_price,
          max_price: service.max_price,
          pre: service.pre,
          duration: service.duration,
        });
      }),
    );
  }

  public async findAll(pg: PaginationDto) {
    const { id, status, limit, sort, skip, branch_id, service_id, order_by } =
      pg;
    const res = await this.dao.list({
      limit: limit == -1 ? 100 : limit,
      sort,
      skip: skip ?? 0,
      status,
      id,
      branch_id,
      order_by,
      service_id,
    });

    return res;
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: BranchServiceDto) {
    return await this.dao.update({ ...dto, id, updated_at: mnDate() }, [
      ...getDefinedKeys(dto),
      'updated_at',
    ]);
  }
  public async updateByServiceAndBranch(dto: BranchServiceDto) {
    try {
      console.log(dto);
      const items = await this.dao.list({
        branch_id: dto.branch_id,
        service_id: dto.service_id,
        status: STATUS.Active,
      });
      await Promise.all(
        items.items.map(async (item) => {
          const prevMeta = {
            branchName: item.meta.branchName,
          };
          const meta = {
            ...dto.meta,
            ...prevMeta,
          };
          await this.dao.update(
            {
              duration: dto.duration,
              max_price: dto.max_price,
              min_price: dto.min_price,
              pre: dto.pre,
              meta,
              id: item.id,
              index: dto.index,
              updated_at: mnDate(),
            },
            [...getDefinedKeys(dto), 'updated_at'],
          );
        }),
      );
    } catch (error) {
      console.log(error);
    }
  }

  public async updateStatus(id: string, status: number) {
    return await this.dao.update({ id, status, updated_at: mnDate() }, [
      'id',
      'status',
      'updated_at',
    ]);
  }
}
