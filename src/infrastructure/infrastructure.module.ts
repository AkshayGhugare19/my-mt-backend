import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PusherModule } from 'nestjs-pusher';
import {
  DEFAULT_REDIS_NAMESPACE,
  RedisModule,
  getRedisToken,
} from '@songkeys/nestjs-redis';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { ENV, envValidationSchema } from '@common/env';
import { eventEmitterConfig } from '@infrastructure/event/config';
import { bullQueueConfig } from '@infrastructure/queue/bull/queue-config';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { CustomZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { ResponseFormatter } from '@common/interceptors/response-formatter.interceptor';
import { ScheduleModule } from '@nestjs/schedule';
import { cacheConfig } from '@infrastructure/cache/cache.config';
import { CacheModule } from '@nestjs/cache-manager';
import { CronJobsModule } from '@infrastructure/cron-jobs/cron-jobs.module';
import { RedlockModule } from '@infrastructure/lock/redlock.module';
import { redisConfig } from '@infrastructure/redis/config';
import { HttpProxyModule } from '@infrastructure/proxy/http-proxy.module';
import { RealtimeModule } from './realtime/realltime.module';
import { RabbitMQModule } from '@infrastructure/queue/rabbitmq';
import { EventModule } from '@infrastructure/event';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { join } from 'path';
import { ParametersModule } from './parameters/parameters.module';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';

@Module({
  imports: [
    PrismaModule,
    CronJobsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: process.env.NODE_ENV === 'production',
      envFilePath: ['.env.test', '.env'],
      validate(config) {
        return envValidationSchema.parse(config);
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: bullQueueConfig,
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: redisConfig,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: cacheConfig,
    }),
    RedlockModule.forRootAsync({
      useFactory: async () => ({
        global: true,
      }),
      inject: [getRedisToken(DEFAULT_REDIS_NAMESPACE)],
    }),
    PusherModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        options: {
          appId: configService.getOrThrow(ENV.PUSHER_APP_ID),
          key: configService.getOrThrow(ENV.PUSHER_APP_KEY),
          secret: configService.getOrThrow(ENV.PUSHER_APP_SECRET),
          host: configService.getOrThrow(ENV.PUSHER_HOST),
          port: configService.getOrThrow(ENV.PUSHER_PORT),
          useTLS: configService.getOrThrow<boolean>(ENV.PUSHER_TLS),
        },
        chunkingOptions: { limit: 4000, enabled: false },
      }),
      inject: [ConfigService],
    }),
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        fallbackLanguage: 'en',
        loaderOptions: {
          path: join(__dirname, '/i18n/'),
          watch: true,
        },
      }),
      resolvers: [
        { use: QueryResolver, options: ['language'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang']),
      ],
      inject: [ConfigService],
    }),
    RealtimeModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(eventEmitterConfig),
    HttpProxyModule,
    RabbitMQModule,
    EventModule,
    ParametersModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: () => randomUUID(),
      },
    }),
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: CustomZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseFormatter,
    },
  ],
  exports: [],
})
export class InfrastructureModule {}
