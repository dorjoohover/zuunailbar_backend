import { ApiProperty } from '@nestjs/swagger';

export class OrderDto {
  @ApiProperty()
  user_id: string;

  @ApiProperty()
  duration: number;
  @ApiProperty()
  order_date: Date;
  @ApiProperty()
  start_time: Date;
  @ApiProperty()
  end_time: Date;
  @ApiProperty()
  order_status: number;
  @ApiProperty()
  pre_amount: number;
  @ApiProperty()
  is_pre_amount_paid: boolean;
  @ApiProperty()
  total_amount: number;
  @ApiProperty()
  paid_amount: number;
  @ApiProperty()
  customer_desc: string;
  @ApiProperty()
  user_desc: string;
  @ApiProperty()
  discount_type: number;
  @ApiProperty()
  discount: number;
}
