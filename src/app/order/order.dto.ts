import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderDetailDto } from '../order_detail/order_detail.dto';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class OrderDto {
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  order_date: Date;
  @ApiProperty()
  start_time: number;
  @ApiProperty()
  order_status: number;
  @ApiProperty()
  total_amount: number;
  @ApiProperty()
  paid_amount: number;
  @ApiProperty()
  customer_desc: string;
  @ApiProperty()
  branch_name: string;
  @ApiProperty()
  discount_type: number;
  @ApiProperty()
  discount: number;
  @ApiProperty({ isArray: true })
  details: OrderDetailDto[];
}


export enum ReportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
}
export class PaymentReportQueryDto {
  @ApiProperty({ example: '2025-08-01', description: 'Эхлэх огноо (YYYY-MM-DD)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2025-08-29', description: 'Дуусах огноо (YYYY-MM-DD)' })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional({ example: 'card', description: 'Төлбөрийн арга (шүүлтүүр)' })
  @IsOptional()
  method?: string;

  @ApiPropertyOptional({ enum: ReportFormat, default: ReportFormat.XLSX })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.XLSX;
}