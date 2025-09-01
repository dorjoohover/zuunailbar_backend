import { ApiProperty } from '@nestjs/swagger';
import { CategoryType } from 'src/base/constants';

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
  type: CategoryType;
  @ApiProperty()
  color: string;
  @ApiProperty()
  size: string;
}
