import {
  CanActivate,
  ExecutionContext,
  Injectable,
  MethodNotAllowedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../../types';
import { UserBlacklistService } from '@modules/user/services/user-blacklist.service';
import { Reflector } from '@nestjs/core';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { FungamessException } from '@modules/betting-providers/fungamess/error/fungamess.error';

@Injectable()
export class BlacklistGuard implements CanActivate {
  constructor(
    protected reflector: Reflector,
    private readonly usersBlacklistService: UserBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAll('publicRoute', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic.some((isPublicMetadata) => !!isPublicMetadata)) return true;

    const request: Request = context.switchToHttp().getRequest();
    const token = request.user as JwtPayload | undefined;
    if (!token) return true;

    const isBlocked = await this.usersBlacklistService.isBlacklisted(token.sub);
    if (isBlocked) {
      throw new MethodNotAllowedException(ErrorMessages.USER_BLOCKED);
    }

    return !isBlocked;
  }
}

@Injectable()
export class FungamessBlacklistGuard extends BlacklistGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return super.canActivate(context);
    } catch (ex) {
      throw new FungamessException(ex);
    }
  }
}
