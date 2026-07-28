import { ApiProperty } from '@nestjs/swagger';

export class MerchantDto {
  @ApiProperty()
  name: string;
}
