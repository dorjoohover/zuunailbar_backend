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
  @ApiProperty()
  password: string;
  title?: string;
  body?: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  password: string;
  @ApiProperty()
  mobile: string;
  @ApiProperty()
  otp: string;
}
