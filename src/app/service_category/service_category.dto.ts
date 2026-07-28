import { ApiProperty } from '@nestjs/swagger';

export class ServiceCategoryDto {
  @ApiProperty()
  name: string;
}
