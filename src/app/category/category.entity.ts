export class Category {
  public id: string;
  public name: string;
  public merchant_id: string;
  public parent_id?: string | null;
  public created_at?: Date;
}
