export class Booking {
  public id: string;
  public approved_by: string;
  public merchant_id: string;
  public branch_id: string;
  public date: Date;
  public start_time: string;
  public end_time: string;
  public status: number;
  public booking_status: number;
  public times: string;
  public created_at?: Date;
  public updated_at?: Date;
}
