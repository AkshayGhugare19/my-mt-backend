import { ENV } from '@common/env';
import { InjectionToken, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocksProxyAgent } from 'socks-proxy-agent';

export const createSocksProvider: (providerInjectionKey: InjectionToken) => Provider = (
  providerInjectionKey: InjectionToken,
) => ({
  provide: providerInjectionKey,
  useFactory: (configService: ConfigService): SocksProxyAgent | null => {
    const proxyUrl = configService.get(ENV.EGRESS_PROXY_URL);
    if (!proxyUrl) {
      return null;
    }
    return new SocksProxyAgent(proxyUrl);
  },
  inject: [ConfigService],
});
