import { ApiProperty } from '@nestjs/swagger';

export class UserServiceDto {
  @ApiProperty()
  services: string[];
  @ApiProperty()
  branch_id: string;
  @ApiProperty()
  user_id: string;
}
