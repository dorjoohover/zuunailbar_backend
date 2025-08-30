import { Injectable } from '@nestjs/common';
import { ProductWarehouseDao } from './product_warehouse.dao';
import {
  ProductsWarehouseDto,
  ProductWarehouseDto,
} from './product_warehouse.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, mnDate, STATUS, ubDateAt00 } from 'src/base/constants';
import { ProductService } from '../product/product.service';
import { WarehouseService } from '../warehouse/warehouse.service';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { Response } from 'express';
import { ExcelService } from 'src/excel.service';

@Injectable()
export class ProductWarehouseService {
  constructor(
    private readonly dao: ProductWarehouseDao,
    private readonly product: ProductService,
    private warehouse: WarehouseService,
    private excel: ExcelService,
  ) {}
  public async create(dto: ProductsWarehouseDto, user: string) {
    const warehouse = await this.warehouse.getById(dto.warehouse_id);
    const products = dto.products;
    await Promise.all(
      products.map(async (pro) => {
        const product = await this.product.findOne(pro.product_id);

        await this.dao.add({
          ...pro,
          warehouse_id: warehouse.id,
          product_name: product.name,
          warehouse_name: warehouse.name,
          id: AppUtils.uuid4(),
          created_by: user,
          status: STATUS.Active,
        });
      }),
    );
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async report(pg: PaginationDto, role: number, res: Response) {
    const selectCols = [
      'id',
      'warehouse_name',
      'product_name',
      'quantity',
      'created_at',
    ];

    // 1) үндсэн жагсаалт
    const { items } = await this.dao.list(
      applyDefaultStatusFilter(pg, role),
      selectCols.join(','),
    );

    // 2) user/customer-уудыг багцлаад авах (боломжтой бол findManyByIds ашигла)

    // 3) мөрүүдээ бэлдэх
    type Row = {
      warehouse: string;
      product: string;
      quantity: number;
      date: Date | string;
    };

    const rows: Row[] = items.map((it: any) => {
      return {
        warehouse: it.name_name,
        product: it.product_name,
        quantity: it.quantity,
        price: it.price,
        date: mnDate(it.created_at),
      };
    });

    // 4) Excel баганууд
    const cols = [
      { header: 'Warehouse', key: 'warehouse', width: 24 },
      { header: 'Product', key: 'product', width: 16 },
      { header: 'Quantity', key: 'quantity', width: 16 },
      { header: 'Price', key: 'price', width: 16 },
      { header: 'Date', key: 'date', width: 16 },
    ];

    // 5) Excel рүү стримлэж буулгах
    return this.excel.xlsxFromIterable(
      res,
      'productWarehouse',
      cols as any,
      rows as any,
      {
        sheetName: 'ProductWarehouse',
        moneyKeys: ['price'],
        dateKeys: ['date'],
      },
    );
  }

  public async findOne(id: string) {
    return await this.dao.getById(id);
  }

  public async update(id: string, dto: ProductWarehouseDto) {
    return await this.dao.update({ ...dto, id }, getDefinedKeys(dto));
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
