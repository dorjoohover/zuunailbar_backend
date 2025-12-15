import { PAYMENT_STATUS, PaymentMethod } from 'src/base/constants';

export class Payment {
  public id: string;
  public merchant_id: string;
  public order_id: string;
  public order_detail_id?: string;
  public invoice_id?: string;
  public payment_id?: string;
  public qr_text?: string;
  public qr_image?: string;

  public amount: number;
  public method: PaymentMethod;
  public status: PAYMENT_STATUS;
  public is_pre_amount: boolean; // урьдчилгаа эсэх
  public paid_at?: Date;
  public created_at?: Date;
  public updated_at?: Date;
  public created_by?: string;
}
