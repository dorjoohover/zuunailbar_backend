import { ApiProperty } from '@nestjs/swagger';

export class ProductWarehouseDto {
  @ApiProperty()
  product_id: string;
  @ApiProperty()
  quantity: number;
  @ApiProperty()
  status: number;
  @ApiProperty()
  date?: Date;
}

export class ProductsWarehouseDto {
  @ApiProperty()
  warehouse_id: string;
  @ApiProperty({ isArray: true })
  products: ProductWarehouseDto[];
}
