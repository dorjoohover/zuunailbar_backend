import { ApiProperty } from '@nestjs/swagger';

export class BookingDto {
  @ApiProperty()
  branch_id?: string;
  @ApiProperty()
  index: number;

  // @ApiProperty()
  // status: number;

  @ApiProperty()
  times?: number[];
}

export interface BookingListType {
  id?: string;
  approved_by?: string;
  branch_id?: string;
  merchant_id?: string;
  booking_status?: number;
  index?: number;
}
