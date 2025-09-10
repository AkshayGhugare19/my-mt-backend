import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class SportsExchangeAuthGuard implements CanActivate {
  constructor() {}

  canActivate(_context: ExecutionContext): boolean {
    return true;

    // TODO: TEMPORARY COMMENTED OUT UNTIL WE HAVE THE IP FROM THE INGRESS
    // const req = context.switchToHttp().getRequest();

    // TODO: TEMPORARY COMMENTED OUT UNTIL WE HAVE THE IP FROM THE INGRESS
    // const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // const allowedIp = this.configService.getOrThrow<string>(
    //   ENV.SPORTS_EXCHANGE_IP,
    // );
    // return !(ip !== allowedIp);
  }
}
