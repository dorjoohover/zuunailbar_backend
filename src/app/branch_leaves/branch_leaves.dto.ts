import { STATUS } from 'src/base/constants';

export class BranchLeaveDto {
  dates: Date[];
  start_time: number;
  end_time: number;
  branch_id: string;
  description: string;
  status: STATUS;
}
