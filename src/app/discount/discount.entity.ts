export class Discount {
  public id: string;
  public service_id: string;
  public branch_id: string;
  public start_date: Date;
  public end_date: Date;
  public type: number;
  public value: number;
  public name: string;
  public status: number;
  public created_at?: Date;
}
