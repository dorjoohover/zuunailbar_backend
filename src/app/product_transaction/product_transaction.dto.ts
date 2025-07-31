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
  transaction_status: number;
}
