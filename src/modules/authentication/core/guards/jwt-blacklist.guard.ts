import { AuthTokenService } from '@modules/authentication/core/service/auth-token.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtBlacklistGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAll('publicRoute', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic.some((isPublicMetadata) => !!isPublicMetadata)) return true;

    const req = context.switchToHttp().getRequest();
    const token = ExtractJwt.fromExtractors([
      ExtractJwt.fromAuthHeaderAsBearerToken(),
      ExtractJwt.fromUrlQueryParameter('token'),
    ])(req);

    const isTokenBlacklisted = await this.authTokenService.isTokenBlacklisted(
      token!,
    );

    if (isTokenBlacklisted) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
