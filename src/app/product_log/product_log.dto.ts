import { ApiProperty } from '@nestjs/swagger';

export class ProductLogDto {
  @ApiProperty()
  product_id: string;
  @ApiProperty()
  quantity: number;
  @ApiProperty()
  price: number;
  @ApiProperty()
  unit_price: number;
  @ApiProperty()
  cargo: number;
  @ApiProperty()
  total_amount: number;
  @ApiProperty()
  paid_amount: number;
  @ApiProperty()
  currency: string;

  @ApiProperty()
  currency_amount: number;
  @ApiProperty()
  product_log_status: number;
  @ApiProperty()
  date: Date;
}
