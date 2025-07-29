import { ApiProperty } from '@nestjs/swagger';

export class UserServiceDto {
  @ApiProperty()
  serviceid: string;
  @ApiProperty()
  userid: string;
  @ApiProperty()
  serviceName: string;
  @ApiProperty()
  userName: string;
}
