import { ApiProperty } from '@nestjs/swagger';

export class CostDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  cost_category_id: string;

  @ApiProperty()
  date: Date;
  @ApiProperty()
  price: number;
}
