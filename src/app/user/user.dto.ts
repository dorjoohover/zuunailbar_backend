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
  description: string;
}
