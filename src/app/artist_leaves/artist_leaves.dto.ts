import { EmployeeStatus } from 'src/base/constants';

export class ArtistLeaveDto {
  start_time: string;
  artist_id: string;
  end_time: string;
  description: string;
  status: EmployeeStatus;
  dates: Date[];
}
