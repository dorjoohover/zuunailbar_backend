import { PaymentType } from 'src/base/constants';

export class IntegrationPaymentDto {
  id: string;
  integration_id: string;
  artist_id: string;
  type: PaymentType;
  amount: number;
  paid_by: string;
  paid_at: Date;
}
