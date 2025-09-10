import { IS_ADMIN } from '@common/constants';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  private readonly validSyncToken = this.configService.getOrThrow('SYNC_TOKEN');

  constructor(
    protected readonly reflector: Reflector,
    protected readonly configService: ConfigService,
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

    if (isAdmin.some((isAdminMetadata) => !!isAdminMetadata)) return true;

    return super.canActivate(context) as Promise<boolean>;
  }
}
