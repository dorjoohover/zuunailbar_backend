import { ApiProperty } from '@nestjs/swagger';

export class BookingDto {
  @ApiProperty()
  date: Date;

  @ApiProperty()
  branch_id: string;

  // @ApiProperty()
  // status: number;

  @ApiProperty()
  times: string[];
}
