import { ENV } from '@common/env';
import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtModuleConfig = (
  configService: ConfigService,
): JwtModuleOptions => {
  return {
    secret: configService.get<string>(ENV.JWT_SECRET),
    signOptions: {
      expiresIn: configService.get<string>(ENV.JWT_DURATION),
      issuer: configService.get<string>(ENV.JWT_ISSUER),
    },
  };
};
