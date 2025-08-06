import { Injectable } from '@nestjs/common';
import { transliterate } from 'transliteration';
import { ProductDao } from './product.dao';
import { ProductDto } from './product.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { CategoryDao } from '../category/category.dao';
import { BrandDao } from '../brand/brand.dao';
import { CategoryService } from '../category/category.service';
import { BrandService } from '../brand/brand.service';
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { ADMINUSERS, getDefinedKeys, PRODUCT_STATUS } from 'src/base/constants';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class ProductService {
  constructor(private readonly dao: ProductDao) {}
  public async create(dto: ProductDto, merchant: string) {
    const count = await this.dao.count();
    const ref = this.generateReferenceCodeByDate(count);
    await this.dao.add({
      ...dto,
      id: AppUtils.uuid4(),
      merchant_id: merchant,
      ref: ref,
      status: PRODUCT_STATUS.Active,
      
    });
  }

  private generateReferenceCodeByDate(index: number): string {
    const now = new Date();

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
    return await this.dao.search({...filter, merchant})
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: ProductDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, PRODUCT_STATUS.Hidden);
  }
}
