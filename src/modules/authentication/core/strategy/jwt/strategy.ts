import { Injectable, NotAcceptableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENV } from '@common/env';
import { JwtPayload } from '@modules/authentication/types';

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: configService.getOrThrow<string>(ENV.JWT_SECRET),
      issuer: configService.getOrThrow<string>(ENV.JWT_ISSUER),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      throw new NotAcceptableException('Token expired');
    }
    return payload;
  }
}
