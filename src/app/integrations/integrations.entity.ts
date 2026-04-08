export class Integration {
  id: string;
  artist_id: string;
  approved_by: string;
  date: Date | string;
  amount: number;
  status: number;
  salary_id?: string;
  order_count: number;
  created_at?: Date;
  approved_at?: Date;
}
