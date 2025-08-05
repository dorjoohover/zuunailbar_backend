export class Schedule {
  public id: string;
  public user_id: string;
  public approved_by: string;
  public branch_id: string;
  public date: Date;
  public start_time: Date;
  public end_time: Date;
  public status: number;
  public schedule_status: number;
  // tusdaa
  public type: number;
  public times: string;
  
  public created_at?: Date;
  public updated_at?: Date;
}
