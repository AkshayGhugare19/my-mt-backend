import { ConsoleLogger, Module } from '@nestjs/common';
import { CommandFactory } from 'nest-commander';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envValidationSchema } from '@common/env';
import { RedisModule } from '@songkeys/nestjs-redis';
import { redisConfig } from '@infrastructure/redis/config';
import { CommandModule } from './cmd';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate(config) {
        return envValidationSchema.parse(config);
      },
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: redisConfig,
    }),
    CommandModule,
  ],
})
class CliModule {}

async function bootstrap(): Promise<void> {
  const logger = new ConsoleLogger();

  await CommandFactory.run(CliModule, {
    logger,
  });
}

bootstrap();
