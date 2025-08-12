import { Injectable } from '@nestjs/common';
import { ProductWarehouseDao } from './product_warehouse.dao';
import {
  ProductsWarehouseDto,
  ProductWarehouseDto,
} from './product_warehouse.dto';
import { AppUtils } from 'src/core/utils/app.utils';
import { getDefinedKeys, STATUS } from 'src/base/constants';
import { ProductService } from '../product/product.service';
import { WarehouseService } from '../warehouse/warehouse.service';
import { PaginationDto } from 'src/common/decorator/pagination.dto';
import { applyDefaultStatusFilter } from 'src/utils/global.service';

@Injectable()
export class ProductWarehouseService {
  constructor(
    private readonly dao: ProductWarehouseDao,
    private readonly product: ProductService,
    private warehouse: WarehouseService,
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
