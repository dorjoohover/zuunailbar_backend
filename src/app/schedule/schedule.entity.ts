export class ScheduleUserMeta {
  mobile: string;
  nickname: string;
  color: number;
}
export class Schedule {
  public id: string;
  public user_id: string;
  public approved_by: string;
  public branch_id: string;
  public index: number;
  public start_time: string;
  public end_time: string;
  public schedule_status: number;
  public times: string;
  public created_at?: Date;
  public updated_at?: Date;
  public meta?: ScheduleUserMeta;
}

export interface ScheduleListType {
  id?: string;
  approved_by?: string;
  branch_id?: string;
  schedule_status?: number;
  user_id?: string;
  index?: number;
  times?: boolean;
}
