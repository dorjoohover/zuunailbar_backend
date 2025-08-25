import { HttpException, Injectable } from '@nestjs/common';
import { ProductDao } from './product.dao';
import { ProductDto } from './product.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { CategoryService } from '../category/category.service';
import { BrandService } from '../brand/brand.service';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import {
  CategoryType,
  getDefinedKeys,
  mnDate,
  PRODUCT_STATUS,
  STATUS,
  ubDateAt00,
} from 'src/base/constants';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { BadRequest } from 'src/common/error';

@Injectable()
export class ProductService {
  constructor(
    private readonly dao: ProductDao,
    private brandService: BrandService,
    private categoryService: CategoryService,
  ) {}
  public async create(dto: ProductDto, merchant: string) {
    await Promise.all(
      Array.from({ length: +dto.quantity - +dto.color }, (_, i) => i).map(
        async (l, i) => {
          const start = +dto.color + i;

          const count = await this.dao.count();
          const ref = this.generateReferenceCodeByDate(count);
          let brand = null,
            category = null;
          try {
            if (dto.brand_id)
              brand = (await this.brandService.getById(dto.brand_id)).name;
            if (dto.category_id)
              category = (await this.categoryService.getById(dto.category_id))
                .name;
          } catch (error) {
            console.log(error);
          }
          await this.dao.add({
            ...dto,
            id: AppUtils.uuid4(),
            merchant_id: merchant,
            brand_id: dto.brand_id ?? null,
            ref: ref,
            status: PRODUCT_STATUS.Active,
            brand_name: brand,
            price: 0,
            quantity: 0,
            name: `${dto.name} ${start}`,
            category_name: category,
            color: null,
            type: category?.type ?? CategoryType.DEFAULT,
          });
        },
      ),
    );
  }

  private generateReferenceCodeByDate(index: number): string {
    const now = ubDateAt00();

    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const datePart = `${yyyy}${MM}${dd}`; // 20250728
    const numberPart = String(index).padStart(4, '0'); // 0001

    return `${datePart}${numberPart}`; // 202507280001
  }
  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async search(filter: SearchDto, merchant: string) {
    return await this.dao.search({
      ...filter,
      merchant,
      status: STATUS.Active,
    });
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: ProductDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }
  public async updateQuantity(id: string, qty: number) {
    const { quantity } = await this.findOne(id);
    if (quantity + qty < 0) new BadRequest().STOCK_INSUFFICIENT;
    const body = {
      id,
      quantity: quantity + qty,
    };
    return await this.dao.update(body, getDefinedKeys(body));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, PRODUCT_STATUS.Hidden);
  }
}
