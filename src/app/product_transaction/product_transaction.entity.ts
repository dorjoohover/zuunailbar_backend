export class ProductTransaction {
  public id: string;
  public product_id: string;
  public user_id: string;
  public branch_id: string;
  public quantity: number;
  public price: number;
  public total_amount: number;
  public status: number;
  public created_at?: Date;
}
