export class Order {
  id: string;
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
  description: string;
  discount: number;
  discount_type: number;
  status: number;
  created_at?: Date;
  created_by?: string;
  salary_date?: Date;
  updated_at?: Date;
  branch_id?: string;
  parallel?: boolean;
}

export class Slot {
  branch_id: string;
  artist_id: string;
  date: Date;
  start_time: Date;
  end_time: Date;
}
