import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class PostInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<any>();
    const response: any = context.switchToHttp().getResponse<any>();

    if (request.method === 'POST') {
      if (
        (response.raw && response.raw.statusCode === 201) ||
        response.statusCode === 201
      ) {
        context.switchToHttp().getResponse().status(HttpStatus.OK);
      }
    }
    return next.handle().pipe(
      map((responseBody) => {
        return {
          succeed: true,
          payload: responseBody,
        };
      }),
    );
    // return next.handle();
  }
}
