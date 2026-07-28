import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleType } from 'src/base/constants';

export class ScheduleDto {
  /**
   * Тухайн мөрийн бодит огноо (YYYY-MM-DD). 2026-07-26-ны шинэчлэлээс хойш
   * `date` нь үндсэн түлхүүр; `index` нь зөвхөн derive/legacy харагдацад ашиглагдана.
   */
  @ApiProperty({ example: '2026-08-03' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'Legacy: 0=Даваа...6=Ням. Өгөхгүй бол date-ээс тооцно.',
  })
  @IsOptional()
  index?: number;

  @ApiProperty()
  user_id: string;

  @ApiPropertyOptional({
    description:
      'Тухайн долоо хоногт артистыг өөр салбарт шилжүүлэх бол энд тавина. Хоосон бол артистын үндсэн салбар хэвээр байна.',
  })
  @IsOptional()
  branch_id?: string;

  @ApiProperty()
  type: ScheduleType;

  @ApiProperty({ isArray: true })
  times: string[];

  @ApiProperty({ required: false })
  finish_time?: string | null;
}

export class ScheduleDayInputDto {
  @ApiProperty({ example: '2026-08-03' })
  @IsDateString()
  date: string;

  @ApiProperty({ isArray: true })
  @IsArray()
  times: string[];

  @ApiPropertyOptional()
  @IsOptional()
  finish_time?: string | null;

  @ApiPropertyOptional({
    description: 'Тухайн өдөр артистыг өөр салбарт шилжүүлэх бол.',
  })
  @IsOptional()
  @IsString()
  branch_id?: string;
}

export class ScheduleWeekDto {
  @ApiProperty()
  user_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  type?: ScheduleType;

  @ApiProperty({ type: [ScheduleDayInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDayInputDto)
  days: ScheduleDayInputDto[];
}
