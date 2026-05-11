import { ApiProperty } from '@nestjs/swagger';

export class CostCategoryDto {
  @ApiProperty()
  name: string;
}
