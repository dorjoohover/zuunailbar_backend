import { ApiProperty } from '@nestjs/swagger';

export class ScheduleDto {
  @ApiProperty()
  date: Date;
  @ApiProperty()
  start_time: Date;
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  end_time: Date;
  @ApiProperty()
  status: number;
  @ApiProperty()
  type: number;
  @ApiProperty({isArray: true})
  times: string[];
}
