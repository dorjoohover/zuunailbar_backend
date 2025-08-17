import { ApiProperty } from '@nestjs/swagger';

export class ServiceDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  icon: string;
  @ApiProperty()
  image: string;
  @ApiProperty()
  description: string;
  @ApiProperty()
  min_price: number;
  @ApiProperty()
  max_price: number;
  @ApiProperty()
  duration: number;
  @ApiProperty()
  branch_id: string;
}
