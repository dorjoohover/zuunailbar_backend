import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';
import { FileErrorLogService } from 'src/error-log.service';

@Catch(HttpException, Error)
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly fileLog: FileErrorLogService,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'Системийн алдаа';

    try {
      if (exception instanceof HttpException) {
        status = exception.getStatus();
        const res = exception.getResponse();
        if (typeof res === 'string') message = res;
        else if (typeof res === 'object' && (res as any).message)
          message = (res as any).message;
      } else if (exception instanceof Error) {
        message = exception.message;
      }

      // File log
      await this.fileLog.log({
        ts: new Date().toISOString(),
        status,
        message,
        name: (exception as any)?.name,
        stack: (exception as any)?.stack,
        method: request?.method,
        url: request?.url,
        ip: request?.ip ?? '',
        user: (request as any)?.user ?? undefined,
      });
    } catch (logError) {
      console.error('Error in exception filter:', logError);
    }

    const responseBody = {
      succeed: false,
      message,
      statusCode: status,
    };

    httpAdapter.reply(response, responseBody, status);
  }
}
