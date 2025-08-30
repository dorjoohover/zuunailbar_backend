import { ApiProperty } from '@nestjs/swagger';

export class ProductTransactionDto {
  @ApiProperty()
  product_id: string;
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  quantity: number;
  @ApiProperty()
  price: number;
  @ApiProperty()
  total_amount: number;
  @ApiProperty()
  paid_amount: number;
  @ApiProperty()
  product_transaction_status: number;
}
