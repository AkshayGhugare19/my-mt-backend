import { Module } from '@nestjs/common';
import { PartnerMatrixApi } from './api';
import { HttpProxyModule } from '@infrastructure/proxy/http-proxy.module';

@Module({
  imports: [HttpProxyModule.register()],
  providers: [PartnerMatrixApi],
  exports: [PartnerMatrixApi],
})
export class PartnerMatrixModule {}
