export class Order {
  id: string;
  user_id: string;
  customer_id: string;
  duration: string;
  order_date: Date;
  start_time: Date;
  end_time: Date;
  status: number;
  pre_amount: number;
  is_pre_amount_paid: boolean;
  total_amount: number;
  paid_amount: number;
  customer_desc: string;
  user_desc: string;
  created_at?: Date;
  updated_at?: Date;
}
