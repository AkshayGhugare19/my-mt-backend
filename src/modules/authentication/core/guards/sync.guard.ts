import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class SyncGuard implements CanActivate {
  private readonly validSyncToken = this.configService.getOrThrow('SYNC_TOKEN');

  constructor(
    protected reflector: Reflector,
    protected readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const syncHeader = request.headers['x-sync-auth'];
    return syncHeader === this.validSyncToken;
  }
}
