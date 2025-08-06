import { ApiProperty } from '@nestjs/swagger';

export class UserProductDto {
  @ApiProperty()
  product_id: string;
  @ApiProperty()
  user_id: string;

  @ApiProperty()
  user_product_status: number;
  @ApiProperty()
  quantity: number;
}
