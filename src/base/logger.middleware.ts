import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    if (req.originalUrl === '/graphql') {
      console.log('🌐 GraphQL Request:', {
        method: req.method,
        url: req.originalUrl,
        body: req.body,
      });
    }
    next();
  }
}
