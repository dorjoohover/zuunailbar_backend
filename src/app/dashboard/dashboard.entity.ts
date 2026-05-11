export class DashboardSnapshot {
  public id: string;
  public date: Date | string;
  public branch_id: string | null;
  public revenue: number;
  public expense: number;
  public cost_total: number;
  public product_total: number;
  public salary: number;
  public profit: number;
  public order_count: number;
  public status: number;
  public created_by?: string | null;
  public created_at?: Date;
  public updated_at?: Date;
}
