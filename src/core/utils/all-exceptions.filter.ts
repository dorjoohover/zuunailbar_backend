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
import { Request } from 'express';
import { FileErrorLogService } from 'src/error-log.service';

@Catch(Error)
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly fileLog: FileErrorLogService,
  ) {}

  async catch(exception: Error, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    try {
      const request = ctx.getRequest<Request>();
      let status = 500;
      let message = 'Internal server error';

      if (exception instanceof HttpException) {
        status = exception.getStatus();
        message = exception.message as string;
      } else if (exception instanceof Error) {
        message = exception.message;
      }
      if (message != 'Forbidden resource' && status != 404 && status != 400) {
        await this.fileLog.log({
          ts: new Date().toISOString(),
          status,
          message,
          name: exception.name,
          stack: exception.stack,
          method: (request as any)?.method,
          url: (request as any)?.url,
          ip: (request as any)?.ip ?? '',
          user: (request as any)?.user ?? undefined,
        });
      }
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
