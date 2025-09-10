import { IS_ADMIN } from '@common/constants';
import { AuthTokenService } from '@modules/authentication/core/service/auth-token.service';
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtAdminGuard extends AuthGuard('jwt-admin') {
  constructor(
    protected reflector: Reflector,
    private readonly authTokenService: AuthTokenService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAll('publicRoute', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic.some((isPublicMetadata) => !!isPublicMetadata)) return true;

    const isAdmin = this.reflector.getAll(IS_ADMIN, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isAdmin.some((isAdminMetadata) => !!isAdminMetadata)) {
      return super.canActivate(context) as Promise<boolean>;
    }

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
