import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENV } from '@common/env';
import { JwtPayload } from '@modules/authentication/types';

@Injectable()
export class JwtAdminAuthStrategy extends PassportStrategy(
  Strategy,
  'jwt-admin',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(ENV.JWT_ADMIN_SECRET),
      issuer: configService.getOrThrow<string>(ENV.JWT_ISSUER),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
