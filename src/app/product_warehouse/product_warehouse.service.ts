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
import { PaginationDto, SearchDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';
import { Response } from 'express';
import { ExcelService } from 'src/excel.service';
import { BadRequest } from 'src/common/error';

@Injectable()
export class ProductWarehouseService {
  constructor(
    private readonly dao: ProductWarehouseDao,
    private readonly product: ProductService,
    private warehouse: WarehouseService,
    private excel: ExcelService,
  ) {}
  private async getQuantitySummaryMap(
    productIds: string[],
    warehouseId?: string,
  ) {
    const summaries = await this.dao.getQuantitySummary(productIds, warehouseId);

    return new Map(
      summaries.map((item) => [
        item.product_id,
        {
          totalQuantity: Number(item.total_quantity ?? 0),
          warehouseQuantity: Number(item.warehouse_quantity ?? 0),
        },
      ]),
    );
  }

  private async validateWarehouseCapacity(
    products: ProductWarehouseDto[],
    warehouseId: string,
  ) {
    const additions = new Map<string, number>();

    products.forEach((item) => {
      const productId = String(item.product_id ?? '');
      const quantity = Number(item.quantity ?? 0);
      additions.set(productId, (additions.get(productId) ?? 0) + quantity);
    });

    const productIds = Array.from(additions.keys()).filter(Boolean);
    const summaryMap = await this.getQuantitySummaryMap(productIds, warehouseId);

    await Promise.all(
      productIds.map(async (productId) => {
        const product = await this.product.findOne(productId);
        const summary = summaryMap.get(productId);
        const totalStock = Number(product?.quantity ?? 0);
        const warehouseQuantity = Number(summary?.warehouseQuantity ?? 0);
        const allocatedOtherWarehouses = Math.max(
          Number(summary?.totalQuantity ?? 0) - warehouseQuantity,
          0,
        );
        const allowedQuantity = Math.max(
          totalStock - allocatedOtherWarehouses,
          0,
        );
        const requestedQuantity =
          warehouseQuantity + Number(additions.get(productId) ?? 0);

        if (requestedQuantity > allowedQuantity) {
          new BadRequest().STOCK_INSUFFICIENT;
        }
      }),
    );
  }

  public async create(dto: ProductsWarehouseDto, user: string) {
    const warehouse = await this.warehouse.getById(dto.warehouse_id);
    const products = dto.products;
    await this.validateWarehouseCapacity(products, warehouse.id);
    await Promise.all(
      products.map(async (pro) => {
        const product = await this.product.findOne(pro.product_id);

        let productWarehouse;
        try {
          productWarehouse = await this.dao.getByProductWarehouse(
            pro.product_id,
            warehouse.id,
          );
        } catch (error) {
          productWarehouse = null;
        }
        if (productWarehouse && productWarehouse != null) {
          const quantity =
            +(productWarehouse.quantity ?? 0) + +(pro.quantity ?? 0);
          await this.dao.updateQuantity(productWarehouse.id, quantity);
        } else {
          await this.dao.add({
            ...pro,
            warehouse_id: warehouse.id,
            product_name: product.name,
            warehouse_name: warehouse.name,
            id: AppUtils.uuid4(),
            created_by: user,
            status: STATUS.Active,
          });
        }
      }),
    );
  }

  public async findAll(pg: PaginationDto, role: number) {
    return await this.dao.list(applyDefaultStatusFilter(pg, role));
  }

  public async search(filter: SearchDto, merchant: string) {
    let results = await this.product.search(filter, merchant);
    const productIds = results.map((item) => String(item.id));
    const summaryMap = await this.getQuantitySummaryMap(
      productIds,
      filter.warehouse_id,
    );

    results = results.map((r) => {
      const parts = r.value.split('__');
      const totalStock = parseInt(parts[3], 10) || 0;
      const summary = summaryMap.get(String(r.id));
      const warehouseQuantity = Number(summary?.warehouseQuantity ?? 0);
      const allocatedOtherWarehouses = Math.max(
        Number(summary?.totalQuantity ?? 0) - warehouseQuantity,
        0,
      );
      const allowedQuantity = Math.max(
        totalStock - allocatedOtherWarehouses,
        0,
      );

      parts[3] = allowedQuantity.toString();
      return {
        ...r,
        value: parts.join('__'),
        quantity: warehouseQuantity,
      };
    });

    return results;
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

  public async update(id: string, dto: ProductsWarehouseDto) {
    const current = await this.findOne(id);

    await Promise.all(
      dto.products.map(async (p) => {
        const targetProductId = p.product_id ?? current.product_id;
        const product = await this.product.findOne(targetProductId);
        const summaryMap = await this.getQuantitySummaryMap(
          [targetProductId],
          current.warehouse_id,
        );
        const summary = summaryMap.get(targetProductId);
        const warehouseQuantity =
          current.product_id === targetProductId
            ? Number(summary?.warehouseQuantity ?? 0)
            : 0;
        const allocatedOtherWarehouses = Math.max(
          Number(summary?.totalQuantity ?? 0) - warehouseQuantity,
          0,
        );
        const allowedQuantity = Math.max(
          Number(product?.quantity ?? 0) - allocatedOtherWarehouses,
          0,
        );

        if (Number(p.quantity ?? 0) > allowedQuantity) {
          new BadRequest().STOCK_INSUFFICIENT;
        }

        const payload = p;
        return await this.dao.update(
          { ...payload, id },
          getDefinedKeys(payload),
        );
      }),
    );
  }

  public async remove(id: string) {
    return await this.dao.updateStatus(id, STATUS.Hidden);
  }
}
