import { ADMINUSERS, CLIENT, EMPLOYEE, STATUS } from 'src/base/constants';
import { PaginationDto } from 'src/common/decorator/pagination.dto';

export function applyDefaultStatusFilter(
  pg: PaginationDto,
  role: number,
): PaginationDto {
  let p = pg;
  if (role === ADMINUSERS) return pg;
  if (role === EMPLOYEE && pg.user_id) {
    p = { ...p, user_id: pg.user_id };
  }
  if (pg?.status && pg.status !== STATUS.Hidden) {
    if (pg.status == 0) {
      let { status, ...body } = pg;
      return body;
    }
    return pg;
  }
  return { ...p, status: STATUS.Active };
}
