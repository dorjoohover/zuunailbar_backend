import { ApiProperty } from '@nestjs/swagger';

export class DashboardSnapshotDto {
  @ApiProperty()
  date: string;

  @ApiProperty({ required: false })
  branch_id?: string | null;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  expense: number;

  @ApiProperty({ required: false })
  cost_total?: number;

  @ApiProperty({ required: false })
  product_total?: number;

  @ApiProperty()
  salary: number;

  @ApiProperty()
  profit: number;

  @ApiProperty()
  order_count: number;

  @ApiProperty({ required: false })
  created_by?: string;
}

export class DashboardSummaryDto {
  revenue: number;
  expense: number;
  cost_total: number;
  product_total: number;
  salary: number;
  profit: number;
  profit_percent: number;
  order_count: number;
  items: any[];
}
