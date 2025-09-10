import { ENV } from '@common/env';
import { FungamessException } from '@modules/betting-providers/fungamess/error/fungamess.error';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { Request } from 'express';

@Injectable()
export class FungamessSignatureGuard implements CanActivate {
  constructor(
    protected reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const bypassSignature = this.configService.get(
      ENV.FUNGAMESS_BYPASS_SIGNATURE,
    );
    if (bypassSignature) {
      return true;
    }
    const req: Request = context.switchToHttp().getRequest();

    const hashAuthorization = req.headers['hash-authorization'];

    const enableIpCheck = this.configService.get(ENV.FUNGAMESS_ENABLE_IP_CHECK);

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const allowedIps = this.configService.getOrThrow<string[]>(
      ENV.FUNGAMESS_WHITELIST_IPS,
    );
    if (enableIpCheck && (!ip || !allowedIps.includes(ip.toString()))) {
      throw new FungamessException(
        new UnauthorizedException('Unauthorized IP address'),
      );
    }

    const data = req.method === 'GET' ? req.query : req.body;
    const dataCopy = JSON.parse(JSON.stringify(data));

    if (dataCopy.extraData) {
      delete dataCopy.extraData;
    }

    const sortedData = Object.keys(dataCopy)
      .sort()
      .reduce((acc: Record<string, unknown>, key: string) => {
        acc[key] = String(dataCopy[key]);

        return acc;
      }, {});

    const jsonData = JSON.stringify(sortedData);
    const hashAuthLocal = createHash('sha256')
      .update(jsonData + process.env.HASH_AUTHORIZATION_KEY, 'utf-8')
      .digest('hex');

    if (hashAuthLocal !== hashAuthorization) {
      throw new FungamessException(new Error('Request not validate'));
    }

    return true;
  }
}
