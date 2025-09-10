import { ConsoleLogger, Global, LogLevel, Module } from '@nestjs/common';
import { CommandFactory } from 'nest-commander';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from '@common/env';
import { SlotegratorLocalTestModule } from 'src/cmd/slotegrator-local-test/slotegrator-local-test.module';
import { SlotegratorLocalTestErrorHandler } from 'src/cmd/slotegrator-local-test/error.filter';

export const defaultLogLevels: LogLevel[] = ['error', 'log'];

const logger = new ConsoleLogger('SlotegratorLocalTest', {
  logLevels: defaultLogLevels,
  timestamp: true,
});

const loggerProvider = {
  provide: ConsoleLogger,
  useValue: logger,
};

@Global()
@Module({
  providers: [loggerProvider],
  exports: [loggerProvider],
})
class LoggerModule {}

@Module({
  imports: [
    LoggerModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
      validate(config) {
        return envValidationSchema.parse(config);
      },
    }),
    SlotegratorLocalTestModule,
  ],
})
class CliModule {}

async function bootstrap(): Promise<void> {
  const errorHandler = new SlotegratorLocalTestErrorHandler(logger);

  await CommandFactory.run(CliModule, {
    serviceErrorHandler: (err) => errorHandler.catch(err),
    logger,
  });
}

bootstrap();
