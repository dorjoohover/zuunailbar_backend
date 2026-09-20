export class Booking {
  public id: string;
  public approved_by: string;
  public merchant_id: string;
  public branch_id: string;
  public start_time: string;
  public end_time: string;
  public finish_time?: string;
  /**
   * Долоо хоногийн өдрийн индекс (0=Даваа...6=Ням), `date`-ээс дериватив.
   * Хуучин код/тайлан руу нийцтэй байлгах зорилгоор хадгалагдсаар байна.
   */
  public index: number;
  /** Тухайн мөрийн бодит огноо (2026-08-05 миграцаас хойш үндсэн түлхүүр). */
  public date?: string | Date;
  /** Admin өөрөө тавьсан уу (false), эсвэл өмнөх долоо хоногоос автоматаар хуулагдсан уу (true). */
  public is_generated?: boolean;
  /** is_generated=true үед хуулбарласан эх мөрийн id (lineage/дебаг). */
  public source_booking_id?: string | null;
  /** true бол тухайн салбар тухайн өдөр амарна (хаалттай). */
  public is_leave?: boolean;
  public leave_description?: string | null;
  public booking_status: number;
  public times: string;
  public created_at?: Date;
  public updated_at?: Date;
}
