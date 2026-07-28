// src/common/filters/global-exception.filter.ts
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { SystemLogger } from 'src/system-logger.service';

@Catch()
export class GlobalExceptionFilter implements NestInterceptor {
  constructor(private logger: SystemLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const req = context.switchToHttp().getRequest();
    const ip =
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      req.ip ||
      null;

    return next.handle().pipe(
      tap(async (responseBody) => {
        const duration = Date.now() - now;

        const logData = {
          time: new Date().toISOString(),
          method: req.method,
          url: req.url,
          ip,
          status: req?.res?.statusCode,
          duration,
          body: req.body,
          params: req.params,
          query: req.query,
          response: responseBody,
        };

        await this.logger.log(logData);
      }),
    );
  }
}
