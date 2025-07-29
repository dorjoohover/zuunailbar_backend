import {
  Injectable,
  ExecutionContext,
  CanActivate,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DashRequest } from '../extentions';

export const IS_PUBLIC_KEY = 'isApiPublic';
export const ApiPublic = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class AdminDashAuthGuard1 implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isApiPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isApiPublic) {
      return true;
    }

    const req: DashRequest = context.switchToHttp().getRequest();
    return true;
  }
}
