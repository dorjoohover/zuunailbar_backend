import { ApiProperty } from '@nestjs/swagger';

export class BranchDto {
  @ApiProperty()
  user: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  address: string;
  order_days: number;
}
