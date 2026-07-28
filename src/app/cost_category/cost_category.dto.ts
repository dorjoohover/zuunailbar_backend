import { ApiProperty } from '@nestjs/swagger';

export class CostCategoryDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false, nullable: true })
  parent_id?: string | null;
}
