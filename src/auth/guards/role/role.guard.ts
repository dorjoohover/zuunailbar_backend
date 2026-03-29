import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolePermission, ROLES_KEY } from './role.decorator';
import { IS_PUBLIC_KEY } from '../jwt/jwt-auth-guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const { user } = context.switchToHttp().getRequest();
    const requiredRole = this.reflector.getAllAndOverride<number[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRole) return true;
    if (!user || !user.user || user.user.role === undefined) {
      return false;
    }
    const { role } = user.user;
    const allowed = requiredRole.includes(role);
    const userPermission = allowed ? RolePermission.ALLOW : RolePermission.DENY;
    request.user.permission = userPermission;

    return userPermission === RolePermission.ALLOW;
  }
}
