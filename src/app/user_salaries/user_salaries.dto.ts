import { ApiProperty } from '@nestjs/swagger';

export class UserSalaryDto {
  @ApiProperty()
  user_id: string;

  @ApiProperty()
  status?: number;
  @ApiProperty()
  salary_status?: number;
  @ApiProperty()
  duration?: number;
  @ApiProperty()
  percent?: number;
}
