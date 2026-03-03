export class IntegrationPayment {
  id: string;
  integration_id: string;
  type: number;
  amount: number;
  artist_id: string;
  paid_by: string;
  paid_at: Date;
}
