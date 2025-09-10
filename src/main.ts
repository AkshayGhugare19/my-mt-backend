import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';
import { AppConfigService } from '@common/config/app-config.service';
import { RabbitMQMicroservice } from '@infrastructure/queue/rabbitmq/config';
import { Swagger } from '@infrastructure/openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const configService: ConfigService = app.get(ConfigService);
  const port = configService.get(ENV.APP_PORT);

  AppConfigService.initialize(app);
  Swagger.setup(app);

  RabbitMQMicroservice.setup(app);

  await app.startAllMicroservices();
  await app.listen(port);
}
bootstrap();
