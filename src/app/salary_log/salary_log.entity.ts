export class SalaryLog {
  id: string;
  user_id: string;
  approved_by: string;
  date: Date;
  amount: number;
  status: number;
  order_count: number;
  created_at?: Date;
  approved_at?: Date;
}
