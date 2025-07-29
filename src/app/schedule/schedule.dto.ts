import { ApiProperty } from '@nestjs/swagger';

export class ScheduleDto {
  @ApiProperty()
  date: Date;
  @ApiProperty()
  starttime: Date;
  @ApiProperty()
  endtime: Date;
  @ApiProperty()
  status: number;
}
