import { ApiProperty } from '@nestjs/swagger';

export class UserSalaryDto {
  @ApiProperty()
  user_id: string;

  @ApiProperty()
  status: number;
  @ApiProperty()
  duration: number;
  @ApiProperty()
  percent: number;
  @ApiProperty()
  date: Date;
}
