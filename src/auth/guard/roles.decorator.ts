import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ADMIN } from 'src/common/constants';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: number[]) => SetMetadata(ROLES_KEY, roles);
export function Admin() {
  return applyDecorators(Roles(ADMIN));
}
