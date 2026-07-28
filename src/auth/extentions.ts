import { Request } from 'express';
import { RolePermission } from './guards/role/role.decorator';
import { Merchant } from 'src/app/merchant/merchant.entity';
import { AdminUser } from 'src/app/admin.user/admin.user.entity';
import { Branch } from 'src/app/branch/branch.entity';

export class DashUser {
  user: AdminUser;
  merchant?: Merchant;
  branch?: Branch;
  permission?: RolePermission;
}

export interface DashRequest extends Request {
  user: DashUser;
}
