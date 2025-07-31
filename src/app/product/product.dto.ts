import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty()
  brand_id: string;
  @ApiProperty()
  category_id: string;
  @ApiProperty()
  name: string;

  @ApiProperty()
  quantity: number;
  @ApiProperty()
  price: number;
  @ApiProperty()
  color: string;
  @ApiProperty()
  size: string;
}
