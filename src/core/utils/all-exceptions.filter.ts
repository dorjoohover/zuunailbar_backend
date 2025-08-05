import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  AppDBResultNotFoundException,
  AppDBTooManyResultException,
} from '../db/app.db.exceptions';
import { logger } from './logger';

@Catch(Error)
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: Error, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    try {
      const request = ctx.getRequest<Request>();
      if (exception instanceof UnauthorizedException) {
      } else {
        logger.error({
          message: exception.message || 'Unhandled exception',
          event: 'unhandled',
          stack: exception.stack,
          url: request.url,
        });
      }
    } catch {}

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = {
      succeed: false,
      message: exception.message || 'Системийн алдаа',
      statusCode: httpStatus,
    };
    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
