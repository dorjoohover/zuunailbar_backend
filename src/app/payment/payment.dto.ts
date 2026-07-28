import { PAYMENT_STATUS, PaymentMethod } from 'src/base/constants';

export class PaymentDto {
  order_id?: string;
  order_detail_id?: string;
  invoice_id?: string;
  payment_id?: string;
  qr_text?: string;
  qr_image?: string;
  amount?: number;
  method?: PaymentMethod;
  status?: PAYMENT_STATUS;
  is_pre_amount?: boolean;
  paid_at?: Date;
  created_by?: string;
}
