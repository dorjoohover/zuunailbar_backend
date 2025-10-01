export class Service {
  public id: string;
  public branch_id: string;
  public merchant_id: string;
  public name: string;
  public max_price: number;
  public min_price: number;
  public pre_amount: number;
  public duration: number;
  public image: string;
  public icon: string;
  public description: string;
  public duplicated: boolean;
  public status: number;
  public created_by: string;
  public created_at?: Date;
}
