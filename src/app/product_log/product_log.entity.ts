import { PRODUCT_LOG_STATUS, STATUS } from 'src/base/constants';

export class ProductLog {
  public id: string;
  public product_id: string;
  public merchant_id: string;
  public quantity: number;
  public price: number;
  public currency: string;
  public currency_amount: number;
  public total_amount: number;
  public date: Date;
  public status: STATUS;
  public product_log_status: PRODUCT_LOG_STATUS;
  public created_by: string;
  public created_at?: Date;
}
