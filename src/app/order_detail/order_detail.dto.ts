import { ApiProperty } from '@nestjs/swagger';

export class OrderDetailDto {
  @ApiProperty()
  orderid: string;
  @ApiProperty()
  serviceid: string;
  @ApiProperty()
  serviceName: string;
  @ApiProperty()
  price: number;
}
