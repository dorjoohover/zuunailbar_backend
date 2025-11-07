import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SERVICE_VIEW } from 'src/base/constants';

export class ServiceDto {
  @ApiProperty({ description: 'Үйлчилгээний нэр' })
  name: string;

  @ApiProperty({ description: 'Үйлчилгээний icon нэр' })
  icon: string;

  @ApiProperty({ description: 'Үйлчилгээний зураг URL' })
  image: string;

  @ApiPropertyOptional({ description: 'Үйлчилгээний тайлбар' })
  description?: string;

  @ApiProperty({ description: 'Хамгийн бага үнэ', example: 10000 })
  min_price: number;

  @ApiProperty({ description: 'Хамгийн их үнэ', example: 30000 })
  max_price: number;

  @ApiProperty({ description: 'Үргэлжлэх хугацаа (минут)', example: 30 })
  duration: number;

  @ApiPropertyOptional({ description: 'Ангиллын ID' })
  category_id?: string;

  @ApiPropertyOptional({
    description: 'Урьдчилгаа uneer',
    example: 10,
  })
  pre?: number;

  @ApiProperty({
    description: 'Web дээр харагдах эсэх тоо/үзэлт',
    example: SERVICE_VIEW.DEFAULT,
  })
  view: number;

  @ApiProperty({ description: 'Давхцсан үйлчилгээ эсэх' })
  parallel: boolean;
}
