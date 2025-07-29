import { Request } from 'express';
import { RolePermission } from './guards/role/role.decorator';
import { Merchant } from 'src/app/merchant/merchant.entity';
import { AdminUser } from 'src/app/admin.user/admin.user.entity';


export class DashUser {
    user: AdminUser;
    merchant?: Merchant;
    permission?: RolePermission;
}

export interface DashRequest extends Request {
    user: DashUser;
}