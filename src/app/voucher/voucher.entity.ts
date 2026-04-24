export class Voucher {
  public id: string;
  public user_id?: string;
  public service_id?: string;
  public name: string;
  public service_name?: string;
  public user_name?: string;
  public mobile?: string;
  public status: number;
  public type: number;
  public value: number;
  public level?: number;
  public voucher_status?: number;
  public note?: string;
  public used_order_id?: string;
  public used_order_date?: Date;
  public used_at?: Date;
  public updated_at?: Date;
  public created_at?: Date;
}
