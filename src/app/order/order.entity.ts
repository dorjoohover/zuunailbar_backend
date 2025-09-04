export class Order {
  id: string;
  user_id: string;
  customer_id: string;
  duration: number;
  order_date: Date | string;
  start_time: string;
  end_time: string;
  order_status: number;
  pre_amount: number;
  is_pre_amount_paid: boolean;
  total_amount: number;
  paid_amount: number;
  customer_desc: string;
  user_desc: string;
  discount: number;
  discount_type: number;
  status: number;
  created_at?: Date;
  updated_at?: Date;
}
