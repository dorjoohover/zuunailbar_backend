import { ApiProperty } from '@nestjs/swagger';
import { ScheduleType } from 'src/base/constants';

export class ScheduleDto {
  @ApiProperty()
  date: Date;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  branch_id: string;
  @ApiProperty()
  type: ScheduleType;

  @ApiProperty({ isArray: true })
  times: string[];
}
