import { ENV } from '@common/env';
import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtAdminModuleConfig = (
  configService: ConfigService,
): JwtModuleOptions => {
  return {
    secret: configService.get<string>(ENV.JWT_ADMIN_SECRET),
    signOptions: {
      expiresIn: configService.get<string>(ENV.JWT_ADMIN_DURATION),
      issuer: configService.get<string>(ENV.JWT_ISSUER),
    },
  };
};
