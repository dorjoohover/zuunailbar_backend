import { EmployeeStatus } from 'src/base/constants';

export class ArtistLeave {
  public id?: string;
  public artist_id?: string;
  public start_time?: string;
  public date?: Date;
  public end_time?: string;
  public description?: string;
  public status?: EmployeeStatus;
  public created_at?: Date;
  public created_by?: string;
}
