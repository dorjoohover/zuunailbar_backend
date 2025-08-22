import { ApiProperty } from '@nestjs/swagger';
import { OrderDetailDto } from '../order_detail/order_detail.dto';

export class OrderDto {
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  order_date: Date;
  @ApiProperty()
  start_time: number;
  @ApiProperty()
  order_status: number;
  @ApiProperty()
  total_amount: number;
  @ApiProperty()
  paid_amount: number;
  @ApiProperty()
  customer_desc: string;
  @ApiProperty()
  branch_name: string;
  @ApiProperty()
  discount_type: number;
  @ApiProperty()
  discount: number;
  @ApiProperty({ isArray: true })
  details: OrderDetailDto[];
}
