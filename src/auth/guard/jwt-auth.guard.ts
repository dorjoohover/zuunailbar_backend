import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // GraphQL context-руу хөрвүүлэх
    const ctx = GqlExecutionContext.create(context);
    const activate = (await super.canActivate(context)) as boolean;

    // handleRequest доторх user-г req.user дээр оноохоос өмнө
    // Passport өөрөө `user`-ийг req дээр тавьдаг
    // Тиймээс энд алдаж байгаа бол context-г дамжуулах нь хангалттай
    return activate;
  }

  handleRequest(err, user, info, context) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    // req.user-д утга оноох
    if (context?.req) {
      context.req.user = user;
    }

    return user;
  }
}
