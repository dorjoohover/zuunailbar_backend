import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from 'src/base/constants';

export class UserDto {
  @ApiProperty()
  firstname?: string;
  @ApiProperty()
  lastname?: string;
  @ApiProperty()
  mobile?: string;
  @ApiProperty()
  birthday?: string;
  mail?: string;
  @ApiProperty()
  password?: string;
  id?: string;
  @ApiProperty()
  branch_id?: string;
  branch_name?: string;
  duration?: number;
  date?: Date;
  percent?: number;
  @ApiProperty()
  role?: number;
  @ApiProperty()
  color?: number;
  @ApiProperty()
  experience?: number;
  @ApiProperty()
  nickname?: string;
  @ApiProperty()
  profile_img?: string;
  @ApiProperty()
  description?: string;
  @ApiProperty()
  device?: string;

  @ApiProperty()
  user_status?: number;
  level?: number;
}
