import { ApiProperty } from '@nestjs/swagger';

export class UserServiceDto {
  @ApiProperty()
  service_id: string;
  @ApiProperty()
  branch_id: string;
  @ApiProperty()
  user_id: string;
}
