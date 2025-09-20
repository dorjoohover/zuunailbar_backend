import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { setupSwagger } from './config/swagger';
import { useContainer } from 'class-validator';
import { LoggingInterceptor } from './common/logging.interceptor';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  app.setGlobalPrefix('/api/v1');
  app.enableCors({
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    origin: '*',
  });
  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ extended: true, limit: '20mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const message = Object.values(
          validationErrors[0].constraints || '',
        ).join(', ');
        return new BadRequestException(message);
      },
    }),
  );
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.useGlobalInterceptors(new LoggingInterceptor());
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
  // await app.listen(5000);
}
bootstrap();
