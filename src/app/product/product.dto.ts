import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty()
  brand_id: string;
  brand_name?: string;
  @ApiProperty()
  category_id: string;
  category_name?: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  quantity: number;
  @ApiProperty()
  color: string;
  @ApiProperty()
  size: string;
}
