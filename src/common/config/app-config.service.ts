import { ENV } from '@common/env';
import { AllExceptionFilter } from '@common/error-filters/catch-all.filter';
import { BullBoardConfigService } from '@infrastructure/queue/bull/bullboard-config.service';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import helmet from 'helmet';
import { EventEmitter } from 'events';
import cookieParser from 'cookie-parser';
import { I18nService } from 'nestjs-i18n';

export class AppConfigService {
  public static initialize(app: INestApplication): void {
    EventEmitter.prototype.setMaxListeners(11);

    this.setApiPrefix(app);
    this.setupHelmet(app);
    this.setupCors(app);
    this.setupCookieParser(app);

    this.mountGlobalExceptionFilter(app);

    BullBoardConfigService.setup(app);
  }

  public static getPort(app: INestApplication): number {
    const configService: ConfigService = app.get(ConfigService);
    return configService.getOrThrow(ENV.APP_PORT);
  }

  private static setupCookieParser(app: INestApplication): void {
    app.use(cookieParser());
  }

  private static mountGlobalExceptionFilter(app: INestApplication): void {
    const httpAdapterHost = app.get(HttpAdapterHost);
    const i18nService = app.get<I18nService<Record<string, any>>>(I18nService);
    app.useGlobalFilters(new AllExceptionFilter(httpAdapterHost, i18nService));
  }

  private static setApiPrefix(app: INestApplication): void {
    app.setGlobalPrefix('/api');
  }

  private static setupHelmet(app: INestApplication): void {
    app.use(helmet());
  }

  public static setupCors(app: INestApplication): void {
    const configService: ConfigService = app.get(ConfigService);

    app.enableCors({
      origin: [configService.getOrThrow(ENV.CORS_ORIGINS).split(',')],
      credentials: true,
    });
  }
}
