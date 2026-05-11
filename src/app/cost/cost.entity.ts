export class Cost {
  public id: string;
  public cost_category_id: string;
  public cost_category_name: string;
  public branch_id: string;
  public branch_name: string;
  public date: Date;
  public price: number;
  public paid_amount: number;
  public status: number;
  public cost_status: number;
  public created_at?: Date;
}
