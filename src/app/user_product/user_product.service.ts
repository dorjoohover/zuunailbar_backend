import { Injectable } from '@nestjs/common';
import { UserProductsDao } from './user_product.dao';
import {
  UpdateUserProductDto,
  UserProductDto,
  UserProductsDto,
} from './user_product.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { UserService } from '../user/user.service';
import { ProductService } from '../product/product.service';
import {
  firstLetterUpper,
  getDefinedKeys,
  mnDate,
  STATUS,
  ubDateAt00,
  usernameFormatter,
} from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { BadRequest } from 'src/common/error';

@Injectable()
export class UserProductService {
  constructor(
    private readonly dao: UserProductsDao,
    private readonly userService: UserService,
    private readonly productService: ProductService,
  ) {}
  private badRequestError = new BadRequest();
  public async create(dto: UserProductsDto) {
    if (!dto.items.length) return [];

    const userId = dto.items[0].user_id;

    const user = await this.userService.findOne(userId);

    const results = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findOne(item.product_id);
        console.log(product.quantity, item.quantity);
        console.log(+product.quantity);
        console.log(+(item.quantity ?? '0'));
        console.log(+product.quantity < +(item.quantity ?? '0'));
        if (+product.quantity == 0) this.badRequestError.STOCK_EMPTY;
        if (+product.quantity < +(item.quantity ?? '0'))
          this.badRequestError.STOCK_INSUFFICIENT;
        return this.dao.add({
          ...item,
          id: AppUtils.uuid4(),
          branch_id: user.branch_id,
          status: STATUS.Active,
          product_name: product.name,
          date: dto.date ?? ubDateAt00(),
          user_name: usernameFormatter(user),
        });
      }),
    );
    return results;
  }

  public async findAll(pg: PaginationDto, role: number) {
    const res = await this.dao.list(applyDefaultStatusFilter(pg, role));
    return res;
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: UpdateUserProductDto) {
    let payload = { ...dto, id, updated_at: mnDate() } as any;
    if (dto.user_id) {
      const user = await this.userService.findOne(dto.user_id);
      payload.user_name = usernameFormatter(user);
    }
    if (dto.product_id) {
      const product = await this.productService.findOne(dto.product_id);
      payload.product_name = product.name;
    }

    return await this.dao.update(payload, [
      ...getDefinedKeys(payload),
      'updated_at',
    ]);
  }

  public async updateUserProductStatus(id: string, status: number) {
    return await this.dao.updateUserProductStatus(id, status);
  }
  public async updateStatus(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
