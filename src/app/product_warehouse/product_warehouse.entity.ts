export class ProductWarehouse {
  public id: string;
  public warehouse_id: string;
  public warehouse_name: string;
  public product_id: string;
  public product_name: string;
  public created_by: string;
  public quantity: number;
  public status: number;
  public date?: Date;
  public created_at?: Date;
  public updated_at?: Date;
}
