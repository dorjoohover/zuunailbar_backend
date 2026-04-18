import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserLevel, VOUCHER, VoucherStatus } from 'src/base/constants';

export class VoucherDto {
  @ApiProperty()
  user_id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: VOUCHER })
  type: VOUCHER;

  @ApiProperty()
  value: number;

  @ApiPropertyOptional({ enum: UserLevel })
  level?: UserLevel | null;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiPropertyOptional({ enum: VoucherStatus })
  voucher_status?: VoucherStatus;
}

export class VoucherRewardConfigItemDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ enum: VOUCHER })
  type: VOUCHER;

  @ApiProperty()
  value: number;
}

export class VoucherConfigDto {
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'number' },
        value: { type: 'number' },
      },
    },
  })
  customer?: Partial<Record<UserLevel, VoucherRewardConfigItemDto>>;
}
