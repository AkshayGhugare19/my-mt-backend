import { EgressProxy } from '@common/constants';
import { createSocksProvider } from '@infrastructure/proxy/socks-provider-factory';
import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { SocksProxyAgent } from 'socks-proxy-agent';

const egressSocksProvider = createSocksProvider(EgressProxy);

@Module({
  providers: [egressSocksProvider],
  exports: [egressSocksProvider],
})
@Global()
export class HttpProxyModule {
  static register(): DynamicModule {
    return HttpModule.registerAsync({
      useFactory: (EgressProxy: SocksProxyAgent | null) => {
        if (!EgressProxy) {
          return {};
        }
        return {
          httpsAgent: EgressProxy,
        };
      },
      inject: [EgressProxy],
    });
  }
}
