import { ApiProperty } from '@nestjs/swagger';

export class DiscountDto {
  @ApiProperty()
  service_id: string;
  @ApiProperty()
  branch_id: string;
  @ApiProperty()
  start_date: Date;
  @ApiProperty()
  end_date: Date;
  @ApiProperty()
  type: number;
  @ApiProperty()
  value: number;
  @ApiProperty()
  name: string;
}
