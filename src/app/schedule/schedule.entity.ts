export class Schedule {
  public id: string;
  public user_id: string;
  public approved_by: string;
  public branch_id: string;
  public index: number;
  public start_time: string;
  public end_time: string;
  public status: number;
  public schedule_status: number;
  public type: number;
  public times: string;
  public created_at?: Date;
  public updated_at?: Date;
}
