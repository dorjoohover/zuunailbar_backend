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
  public async create(dto: UserProductsDto) {
    if (!dto.items.length) return [];

    const userId = dto.items[0].user_id;

    // 🔍 Нэг удаа хэрэглэгч болон түүний авсан бүтээгдэхүүнүүдийг авна
    const user = await this.userService.findOne(userId);
    const userProducts = await this.dao.getByUser(userId, STATUS.Active);

    // ✅ Тухайн хэрэглэгчид ирж буй шинэ DTO жагсаалтаас ID-ууд
    const dtoProductIds = new Set(dto.items.map((i) => i.product_id));

    // 🧹 DTO-д байхгүй бүх хуучин бүтээгдэхүүнийг нуух
    const removedProducts = userProducts.filter(
      (up) => !dtoProductIds.has(up.product_id),
    );
    await Promise.all(
      removedProducts.map((rp) => this.updateStatus(rp.id, STATUS.Hidden)),
    );

    // 🔁 Бүх шинэ болон хуучин бүтээгдэхүүнийг боловсруулж update эсвэл add хийх
    const results = await Promise.all(
      dto.items.map(async (item) => {
        const product = await this.productService.findOne(item.product_id);

        const existing = userProducts.find(
          (up) => up.product_id === item.product_id,
        );

        if (existing) {
          return this.update(existing.id, {
            quantity: item.quantity,
            user_product_status: item.user_product_status,
          });
        }

        // 🆕 Add
        return this.dao.add({
          ...item,
          id: AppUtils.uuid4(),
          branch_id: user.branch_id,
          status: STATUS.Active,
          product_name: product.name,
          date: dto.date ?? mnDate(),
          user_name: usernameFormatter(user),
        });
      }),
    );

    return results;
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: UpdateUserProductDto) {
    console.log(id);
    return await this.dao.update({ ...dto, id, updated_at: mnDate() }, [
      ...getDefinedKeys(dto),
      'updated_at',
    ]);
  }

  public async updateStatus(id: string, status: number) {
    return await this.dao.updateStatus(id, status);
  }
}
