import { ApiProperty } from '@nestjs/swagger';

export class WarehouseDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  address: string;
}
