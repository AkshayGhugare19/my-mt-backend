import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface RedlockModuleOptions {
  global?: boolean;
}

export const {
  ConfigurableModuleClass: RedlockBaseModule,
  MODULE_OPTIONS_TOKEN: REDLOCK_MODULE_OPTIONS_TOKEN,
  ASYNC_OPTIONS_TYPE: REDLOCK_ASYNC_OPTIONS_TYPE,
  OPTIONS_TYPE: REDLOCK_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<RedlockModuleOptions>()
  .setFactoryMethodName('forRootAsync')
  .setClassMethodName('forRoot')
  .build();
