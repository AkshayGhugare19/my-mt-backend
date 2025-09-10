import { ENV } from '@common/env';
import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const fungamessJwtModuleConfig = (
  configService: ConfigService,
): JwtModuleOptions => {
  return {
    secret: configService.getOrThrow<string>(ENV.FUNGAMESS_JWT_SECRET),
    signOptions: {
      expiresIn: configService.getOrThrow<string>(ENV.FUNGAMESS_JWT_DURATION),
    },
  };
};
