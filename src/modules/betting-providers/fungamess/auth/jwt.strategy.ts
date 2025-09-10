import { ENV } from '@common/env';
import { FungamessJwtPayload } from '@modules/betting-providers/fungamess/types';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ParsedQs } from 'qs';

@Injectable()
export class FungamessJwtAuthStrategy extends PassportStrategy(
  Strategy,
  'jwt-sportsbook',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): any => {
          return request?.query?.token || request?.body?.token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(ENV.FUNGAMESS_JWT_SECRET),
    });
  }

  authenticate(
    req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
    options?: any,
  ): void {
    const token = ExtractJwt.fromExtractors([
      (request: Request): any => {
        return request?.query?.token || request?.body?.token;
      },
    ])(req);

    if (!token) {
      // Error code 417 from the documentation
      throw new HttpException('Token not found', 417);
    }

    // const payload = this.validateJwt(token);
    const payload = this.jwtService.decode(token);
    // if (payload.exp * 1000 < Date.now()) {
    //   // Error code 410 from the documentation
    //   throw new HttpException('Token expired', 410);
    // }
    return this.success(payload);
  }

  private validateJwt(token: string): FungamessJwtPayload {
    try {
      return this.jwtService.verify(token, {
        ignoreExpiration: true,
      }) as FungamessJwtPayload;
    } catch (error) {
      // Error code 417 from the documentation
      throw new HttpException('Token not found', 417);
    }
  }

  validate(payload: FungamessJwtPayload): FungamessJwtPayload {
    return payload;
  }
}
