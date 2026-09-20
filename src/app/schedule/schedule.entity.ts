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
  /** Тухайн мөрийн бодит огноо (2026-07-26 миграцаас хойш үндсэн түлхүүр). */
  public date: string | Date;
  /**
   * Долоо хоногийн өдрийн индекс (0=Даваа...6=Ням), date-ээс дериватив.
   * Хуучин код/тайлан руу нийцтэй байлгах зорилгоор хадгалагдсаар байна.
   */
  public index: number;
  public start_time: string;
  public end_time: string;
  public finish_time?: string;
  public schedule_status: number;
  public times: string;
  /** Admin өөрөө тавьсан уу (false), эсвэл өмнөх долоо хоногоос автоматаар хуулагдсан уу (true). */
  public is_generated?: boolean;
  /** is_generated=true үед хуулбарласан эх мөрийн id (lineage/дебаг). */
  public source_schedule_id?: string | null;
  /**
   * NULL = амралтгүй. Утгатай бол EmployeeStatus enum-тэй ижил (жишээ нь
   * VACATION/DEKIRIT) — тухайн (user_id, date) өдөр артист амарна гэсэн үг.
   * `availability_slots` view энэ талбар NULL биш мөрийг хасдаг.
   */
  public leave_status?: number | null;
  public leave_description?: string | null;
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
  date?: string;
  date_from?: string;
  date_to?: string;
  is_generated?: boolean;
  times?: boolean;
  finish_time?: string;
}
