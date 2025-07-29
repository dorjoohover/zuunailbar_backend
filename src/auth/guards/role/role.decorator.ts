import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ADMIN, ADMINUSERS, EMPLOYEE, MANAGER } from 'src/base/constants';

export enum RolePermission {
  DENY = 10,
  ALLOW = 20,
  MODERATOR = 30,
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: number[]) => SetMetadata(ROLES_KEY, roles);

export function System() {
  return applyDecorators(Roles(ADMINUSERS));
}

export function Admin() {
  return applyDecorators(Roles(ADMIN, ADMINUSERS));
}

export function Manager() {
  return applyDecorators(Roles(MANAGER, ADMIN, ADMINUSERS));
}

export function Employee() {
  return applyDecorators(Roles(EMPLOYEE, MANAGER, ADMIN, ADMINUSERS));
}
