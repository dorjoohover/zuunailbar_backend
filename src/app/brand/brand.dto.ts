import { ApiProperty } from '@nestjs/swagger';

export class BrandDto {
  @ApiProperty()
  name: string;
}
