import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  mobile: string;
  @ApiProperty()
  password: string;
}
export class RegisterDto {
  @ApiProperty()
  mobile: string;
  token?: string;
  title?: string;
  body?: string;
}
