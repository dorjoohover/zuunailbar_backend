import { ApiProperty } from '@nestjs/swagger';

export class OrderDetailDto {
  @ApiProperty()
  order_id: string;
  @ApiProperty()
  id?: string;
  @ApiProperty()
  service_id: string;
  @ApiProperty()
  service_name: string;
  description: string;
  user_id: string;
  nickname: string;
  @ApiProperty()
  price: number;
  @ApiProperty()
  duration: number;
  start_time: string;
  end_time: string;
}
