export class Cost {
  public id: string;
  public category_id: string;
  public branch_id: string;
  public branch_name: string;
  public product_id: string;
  public product_name: string;
  public date: Date;
  public price: number;
  public paid_amount: number;
  public status: number;
  public cost_status: number;
  public created_at?: Date;
}
