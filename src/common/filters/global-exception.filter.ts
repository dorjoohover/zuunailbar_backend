// src/common/filters/global-exception.filter.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SystemLogger } from 'src/system-logger.service';

/**
 * Хүсэлт бүрийг (амжилттай ч, алдаатай ч) SystemLogger-ээр файл руу
 * (../logs/system/requests-YYYY-MM-DD.jsonl) бичдэг interceptor.
 *
 * ⚠️ Түүх: Энэ класс өмнө нь `@Catch()` декоратортой, гэвч ExceptionFilter
 * биш харин яг энэ (интерсептор) маягаар бичигдсэн байсан. Гэтэл
 * app.module.ts дотор APP_FILTER-ээр бүртгэгдсэн байсан тул Nest үүнийг
 * exception filter гэж үзэж, `catch()` метод дуудахыг оролддог байсан —
 * тэр метод байхгүй тул алдааны замд юу ч хийгддэггүй, мөн доор бүртгэгдсэн
 * (`AllExceptionsFilter`) жинхэнэ error-logging филтер рүү хүрдэггүй байсан.
 * Энэ нь "алдааны нэмэлт лог алга" гэсэн гол шалтгаан байсан тул одоо
 * APP_INTERCEPTOR-ээр зөв бүртгэнэ (app.module.ts-г үзнэ үү) — амжилттай
 * ба алдаатай хариу хоёуланг нь энд log хийгээд, алдааг доош (Nest-ийн
 * жинхэнэ exception filter, AllExceptionsFilter, руу) дахин throw хийж
 * дамжуулна.
 */
@Injectable()
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

    const baseLogData = {
      method: req.method,
      url: req.url,
      ip,
      body: req.body,
      params: req.params,
      query: req.query,
    };

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          this.logger
            .log({
              time: new Date().toISOString(),
              ...baseLogData,
              status: req?.res?.statusCode,
              duration: Date.now() - now,
              response: responseBody,
            })
            .catch(() => {});
        },
        error: (error) => {
          this.logger
            .log({
              time: new Date().toISOString(),
              ...baseLogData,
              status: error?.status ?? error?.getStatus?.() ?? 500,
              duration: Date.now() - now,
              error: {
                name: error?.name,
                message: error?.message,
                stack: error?.stack,
              },
            })
            .catch(() => {});
        },
      }),
    );
  }
}
