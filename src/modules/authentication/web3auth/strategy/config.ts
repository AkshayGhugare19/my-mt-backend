import { ENV } from '@common/env';
import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

export const jwtWeb3AuthModuleConfig = (
  configService: ConfigService,
): JwtModuleOptions => {
  return {
    privateKey: configService.getOrThrow<string>(ENV.JWT_PRIVATE_KEY),
    publicKey: configService.getOrThrow<string>(ENV.JWT_PUBLIC_KEY),
    signOptions: {
      algorithm: 'RS256',
      expiresIn: '1m',
      audience: 'web3auth',
      issuer: configService.getOrThrow<string>(ENV.JWT_ISSUER),
      jwtid: randomUUID(),
    },
  };
};
