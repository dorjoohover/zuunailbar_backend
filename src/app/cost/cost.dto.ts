import { ApiProperty } from '@nestjs/swagger';

export class CostDto {
  @ApiProperty()
  product_id: string;

  @ApiProperty()
  date: Date;
  @ApiProperty()
  price: number;
  @ApiProperty()
  paid_amount: number;
  @ApiProperty()
  cost_status: number;
}
