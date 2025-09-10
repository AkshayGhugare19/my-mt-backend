import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  constructor(protected reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAll('publicRoute', [
      context.getHandler(),
      context.getClass(),
    ]);
    const publicRoute = isPublic.some((isPublicMetadata) => !!isPublicMetadata);

    try {
      const canActivate = await super.canActivate(context);
      return publicRoute
        ? (canActivate as boolean) || true
        : (canActivate as boolean);
    } catch (error) {
      if (publicRoute) return true;
      throw error;
    }
  }
}
