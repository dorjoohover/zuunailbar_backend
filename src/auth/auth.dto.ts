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
  otp?: string;
  @ApiProperty()
  password: string;
  title?: string;
  body?: string;
  percent?: number;
  lastname: string
  firstname: string
}

export class ResetPasswordDto {
  @ApiProperty()
  password: string;
  @ApiProperty()
  mobile: string;
  @ApiProperty()
  otp: string;
  lastname: string
  firstname: string
}
export class ResetCurrentPasswordDto {
  @ApiProperty()
  password: string;
  @ApiProperty()
  newPassword: string;
  lastname: string
  firstname: string
}
export class OtpDto {
  @ApiProperty()
  mobile: string;
}
