import { ApiProperty } from '@nestjs/swagger';

export class UserProductDto {
  @ApiProperty()
  productid: string;
  @ApiProperty()
  userid: string;
  @ApiProperty()
  productNama: string;
  @ApiProperty()
  userName: string;
  @ApiProperty()
  status: number;
}
