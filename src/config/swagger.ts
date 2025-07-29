import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Swagger API')
  .setDescription('Nothing special')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      in: 'header',
    },
    'access-token',
  )
  .addApiKey(
    {
      type: 'apiKey',
      in: 'header',
      name: 'merchant-id',
    },
    'merchant-id', // ← reference name
  )
  .addApiKey(
    {
      type: 'apiKey',
      in: 'header',
      name: 'branch-id',
    },
    'branch-id', // ← reference name
  )
  .build();
const options: SwaggerDocumentOptions = {
  operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
};
const customOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    tagsSorter: 'alpha',
  },
  customSiteTitle: 'Swagger API',
};

export const setupSwagger = (app: INestApplication) => {
  const document = SwaggerModule.createDocument(app, config, options);
  return SwaggerModule.setup('/docs', app, document, customOptions);
};
