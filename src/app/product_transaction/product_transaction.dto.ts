import { ApiProperty } from '@nestjs/swagger';

export class ProductTransactionDto {
  @ApiProperty()
  product_id: string;
  @ApiProperty({ required: false })
  user_id?: string | null;
  @ApiProperty()
  quantity: number;
  @ApiProperty({ required: false })
  unit_price?: number;
  @ApiProperty()
  price: number;
  @ApiProperty()
  total_amount: number;
  @ApiProperty({ required: false })
  paid_amount?: number;
  @ApiProperty({ required: false })
  date?: string;
  @ApiProperty({ required: false })
  product_transaction_status?: number;
}
