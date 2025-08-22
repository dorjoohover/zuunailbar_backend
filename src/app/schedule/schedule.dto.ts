import { ApiProperty } from '@nestjs/swagger';
import { ScheduleType } from 'src/base/constants';

export class ScheduleDto {
  @ApiProperty()
  index: number;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  branch_id: string;
  @ApiProperty()
  type: ScheduleType;

  @ApiProperty({ isArray: true })
  times: string[];
}
export class UpdateScheduleDto {
  @ApiProperty()
  index: number;

  @ApiProperty()
  user_id: string;
  @ApiProperty()
  approved_by: string;
  @ApiProperty()
  start_time: string;
  @ApiProperty()
  end_time: string;

  @ApiProperty()
  branch_id: string;
  @ApiProperty()
  type: ScheduleType;

  @ApiProperty()
  times: string;
}
