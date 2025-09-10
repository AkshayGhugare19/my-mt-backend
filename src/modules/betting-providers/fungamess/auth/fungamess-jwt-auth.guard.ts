import { FungamessException } from '@modules/betting-providers/fungamess/error/fungamess.error';
import { ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { Observable, lastValueFrom } from 'rxjs';

@Injectable()
export class FungamessJwtAuthGuard extends AuthGuard('jwt-sportsbook') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const isAuthorized = await this.resolveAuthorizationValue(
        super.canActivate(context),
      );
      if (isAuthorized) {
        return true;
      }
    } catch (error) {}
    const req: Request = context.switchToHttp().getRequest();
    const userId: string | undefined = req.query.userId || req.body.userId;
    if (userId && !userId.includes('Player')) {
      throw new FungamessException(new HttpException('User not found', 404));
    }
    throw new FungamessException(new HttpException('Token not found', 417));
  }

  private resolveAuthorizationValue(
    isAuthorized: boolean | Promise<boolean> | Observable<boolean>,
  ): Promise<boolean> {
    if (typeof isAuthorized === 'boolean') {
      return Promise.resolve(isAuthorized);
    }
    if (isAuthorized instanceof Promise) {
      return isAuthorized;
    }
    return lastValueFrom(isAuthorized);
  }
}
