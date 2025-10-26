export class Service {
  public id: string;
  public branch_id: string;
  public merchant_id: string;
  public name: string;
  public max_price: number;
  public min_price: number;
  public duration: number;
  public image: string;
  public icon: string;
  public description: string;
  public duplicated: boolean;
  public pre: number;
  public status: number;
  public created_by: string;
  public category: number;
  public created_at?: Date;
  public view: number;
}
