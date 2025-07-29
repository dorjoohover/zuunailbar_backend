import { ApiProperty } from '@nestjs/swagger';

export class OrderDto {
  @ApiProperty()
  userid: string;
  @ApiProperty()
  customerid: string;
  @ApiProperty()
  duration: string;
  @ApiProperty()
  orderDate: Date;
  @ApiProperty()
  startTime: Date;
  @ApiProperty()
  endTime: Date;
  @ApiProperty()
  status: number;
  @ApiProperty()
  preAmount: number;
  @ApiProperty()
  isPreAmountPaid: boolean;
  @ApiProperty()
  totalAmount: number;
  @ApiProperty()
  paidAmount: number;
  @ApiProperty()
  customerDesc: string;
  @ApiProperty()
  userDesc: string;
}
