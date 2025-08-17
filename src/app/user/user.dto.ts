import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty()
  firstname: string;
  @ApiProperty()
  lastname: string;
  @ApiProperty()
  mobile: string;
  @ApiProperty()
  birthday: string;
  @ApiProperty()
  password: string;
  @ApiProperty()
  role: number;
  @ApiProperty()
  color: number;
  @ApiProperty()
  experience: number;
  @ApiProperty()
  nickname: string;
  @ApiProperty()
  profile_img: string;
  @ApiProperty()
  description: string;
  @ApiProperty()
  device: string;
}
