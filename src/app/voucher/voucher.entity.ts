 
export class Voucher {
  public id: string;
  public user_id: string;
  public service_id: string;
  public name: string;
  public service_name: string;
  public user_name: string;
  public status: number;
  public type: number;
  public updated_at?: Date;
  public created_at?: Date;
}
