import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BranchServiceMeta } from './branch_service.entity';

export class BranchServiceDto {
  @ApiProperty({ description: 'Салбарын ID' })
  branch_id: string;

  @ApiProperty({ description: 'Service рүү FK байх service ID' })
  service_id: string;

  @ApiProperty({ description: 'Тухайн салбар дахь хамгийн бага үнэ' })
  min_price: number;

  @ApiProperty({ description: 'Тухайн салбар дахь хамгийн их үнэ' })
  max_price: number;

  @ApiProperty({ description: 'Урьдчилгаа үнэ' })
  pre: number;

  @ApiProperty({ description: 'Үйлчилгээний хугацаа (минут)' })
  duration: number;

  @ApiPropertyOptional({ description: 'Үйлчилгээний custom name' })
  custom_name?: string;

  @ApiPropertyOptional({ description: 'Үйлчилгээний custom description' })
  custom_description?: string;

  @ApiPropertyOptional({ description: 'UI-д дараалалд ашиглана' })
  index?: number;

  @ApiPropertyOptional({ description: 'Төлөв (status)' })
  status?: number;

  @ApiProperty({ description: 'Үйлчилгээг нэмсэн хэрэглэгчийн ID' })
  created_by?: string;
  meta?: BranchServiceMeta;
}
