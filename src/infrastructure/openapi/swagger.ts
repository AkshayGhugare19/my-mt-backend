import { patchNestjsSwagger } from '@anatine/zod-nestjs';
import { ENV } from '@common/env';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { existsSync, readFileSync } from 'fs';

export abstract class Swagger {
  static setup(app: INestApplication): OpenAPIObject | null {
    const configService = app.get(ConfigService);
    if (!configService.get(ENV.ENABLE_SWAGGER)) return null;
    const apiDescription = existsSync('api-description.md')
      ? readFileSync('api-description.md').toString()
      : '#API description';

    const swaggerSettings = new DocumentBuilder()
      .setTitle('API')
      .setDescription(apiDescription)
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        name: 'Login Client',
        bearerFormat: 'JWT',
        in: 'header',
      })
      .build();
    patchNestjsSwagger();
    const document = SwaggerModule.createDocument(app, swaggerSettings);

    SwaggerModule.setup('/api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      }
    });
    return document;
  }
}
