import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BookingDto {
  @ApiProperty()
  branch_id?: string;

  /**
   * Тухайн мөрийн бодит огноо (YYYY-MM-DD). 2026-08-05-ны шинэчлэлээс хойш
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
  times?: string[];

  @ApiProperty()
  finish_time?: string | null;
}

export class BookingDayInputDto {
  @ApiProperty({ example: '2026-08-03' })
  @IsDateString()
  date: string;

  @ApiProperty({ isArray: true })
  @IsArray()
  times: string[];

  @ApiPropertyOptional()
  @IsOptional()
  finish_time?: string | null;
}

export class BookingWeekDto {
  @ApiProperty()
  branch_id: string;

  @ApiProperty({ type: [BookingDayInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingDayInputDto)
  days: BookingDayInputDto[];
}

/**
 * Салбарт нэг эсвэл хэд хэдэн өдөр амралт (хаалттай өдөр) тавих/цуцлах
 * (хуучин `branch_leaves` API-ийн оронд). `is_leave: false` бол тухайн
 * өдрүүдийн амралтыг цуцална.
 */
export class SetBranchLeaveDto {
  @ApiProperty()
  branch_id: string;

  @ApiProperty({ isArray: true, example: ['2026-08-10', '2026-08-11'] })
  @IsArray()
  dates: string[];

  @ApiProperty({ default: true })
  is_leave: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;
}

export interface BookingListType {
  id?: string;
  approved_by?: string;
  branch_id?: string;
  merchant_id?: string;
  booking_status?: number;
  index?: number;
  date?: string;
  date_from?: string;
  date_to?: string;
  is_generated?: boolean;
}
