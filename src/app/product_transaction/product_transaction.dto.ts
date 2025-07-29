import { ApiProperty } from '@nestjs/swagger';

export class ProductTransactionDto {
  @ApiProperty()
  productid: string;
  @ApiProperty()
  userid: string;
  @ApiProperty()
  quantity: string;
  @ApiProperty()
  price: string;
  @ApiProperty()
  totalAmount: string;
  @ApiProperty()
  status: string;
}
