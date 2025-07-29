import { ApiProperty } from '@nestjs/swagger';

export class ProductDto {
  @ApiProperty()
  brandid: string;
  @ApiProperty()
  categoryid: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  ref: string;
  @ApiProperty()
  quantity: number;
  @ApiProperty()
  price: number;
  @ApiProperty()
  color: string;
}
