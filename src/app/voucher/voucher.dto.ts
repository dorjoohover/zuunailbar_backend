import { ApiProperty } from '@nestjs/swagger';

export class VoucherDto {
  @ApiProperty()
  service_id?: string;
  @ApiProperty()
  user_id?: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  type: number;
  @ApiProperty()
  value: number;
  @ApiProperty()
  level?: number;
  @ApiProperty()
  voucher_status?: number;
  @ApiProperty()
  note?: string;
}
