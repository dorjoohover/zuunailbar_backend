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
import { ExcelService } from 'src/excel.service';
import { Response } from 'express';

@Injectable()
export class ProductService {
  constructor(
    private readonly dao: ProductDao,
    private brandService: BrandService,
    private excel: ExcelService,
    private categoryService: CategoryService,
  ) {}
  public async create(dto: ProductDto, merchant: string) {
    const count = await this.dao.count();
    const ref = this.generateReferenceCodeByDate(count);
    let brand = null,
      category = null;
    try {
      if (dto.brand_id)
        brand = (await this.brandService.getById(dto.brand_id)).name;
      if (dto.category_id)
        category = (await this.categoryService.getById(dto.category_id)).name;
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
      category_name: category,
      type: category?.type ?? dto.type ?? CategoryType.DEFAULT,
    });
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

  public async report(pg: PaginationDto, role: number, res: Response) {
    const selectCols = [
      'id',
      'brand_name',
      'category_name',
      'name',
      'quantity',
      'price',
    ];

    // 1) үндсэн жагсаалт
    const { items } = await this.dao.list(
      applyDefaultStatusFilter(pg, role),
      selectCols.join(','),
    );

    // 2) user/customer-уудыг багцлаад авах (боломжтой бол findManyByIds ашигла)

    // 3) мөрүүдээ бэлдэх
    type Row = {
      brand: string;
      category: string;
      name: string;
      quantity: number;
      price: number;
    };

    const rows: Row[] = items.map((it: any) => {
      return {
        name: it.name,
        brand: it.brand_name,
        category: it.category_name,
        price: it.price,
        quantity: it.quantity,
      };
    });

    // 4) Excel баганууд
    const cols = [
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Brand', key: 'brand', width: 16 },
      { header: 'Category', key: 'category', width: 16 },
      { header: 'Price', key: 'price', width: 16 },
      { header: 'Quantity', key: 'quantity', width: 16 },
    ];

    // 5) Excel рүү стримлэж буулгах
    return this.excel.xlsxFromIterable(
      res,
      'product',
      cols as any,
      rows as any,
      {
        sheetName: 'Products',
        moneyKeys: ['price'],
      },
    );
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: ProductDto) {
    const headers = [];
    try {
      if (dto.brand_id && dto.brand_id != '') {
        dto.brand_name =
          (await this.brandService.getById(dto.brand_id))?.name ?? '';
      } else {
        headers.push('brand_id');
        headers.push('brand_name');
        dto.brand_id = null;
        dto.brand_name = null;
      }
      if (dto.category_id && dto.category_id != '') {
        dto.category_name =
          (await this.categoryService.getById(dto.category_id))?.name ?? '';
      } else {
        headers.push('category_id');
        headers.push('category_name');
        dto.category_id = null;
        dto.category_name = null;
      }
    } catch (error) {}

    return await this.dao.update({ ...dto, id }, [
      ...getDefinedKeys(dto),
      ...headers,
    ]);
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
