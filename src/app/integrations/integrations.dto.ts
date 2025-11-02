export class IntegrationDto {
  user_id: string;
  approved_by: string;
  date: Date;
  amount: number;
  order_count: number;
}

export class IntegrationLogDto {
  user_id: string;
  approved_by: string;
  date: Date;
  amount: number;
  order_status: number;
  order_count: number;
  day: number;
}
