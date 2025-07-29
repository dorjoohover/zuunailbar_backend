import { ApiProperty } from '@nestjs/swagger';

export class AdminUserDto {
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
  description: string;
}
