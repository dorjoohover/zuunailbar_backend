import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  mobile: string;
  @ApiProperty()
  password: string;
}
