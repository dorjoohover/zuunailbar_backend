import { Injectable } from '@nestjs/common';
import { UserProductsDao } from './user_product.dao';
import { UserProductDto } from './user_product.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { UserService } from '../user/user.service';
import { ProductService } from '../product/product.service';
import {
  firstLetterUpper,
  getDefinedKeys,
  usernameFormatter,
} from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class UserProductService {
  constructor(
    private readonly dao: UserProductsDao,
    private readonly userService: UserService,
    private readonly productService: ProductService,
  ) {}
  public async create(dto: UserProductDto, branch: string) {
    const user = await this.userService.findOne(dto.user_id);
    const product = await this.productService.findOne(dto.product_id);
    console.log(dto, branch);
    const res = await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      branch_id: branch,
      status: dto.status,
      product_name: product.name,
      user_name: usernameFormatter(user),
    });
    return res;
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: UserProductDto) {
    return await this.dao.update({ ...dto, id, updated_at: new Date() }, [
      ...getDefinedKeys(dto),
      'updated_at',
    ]);
  }

  public async updateStatus(id: string, status: number) {
    return await this.dao.updateStatus(id, status);
  }
}
