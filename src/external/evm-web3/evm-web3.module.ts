import { SecretsModule } from '@infrastructure/secrets/secrets.module';
import { Module } from '@nestjs/common';
import { EvmWeb3Provider } from './provider';

@Module({
  imports: [SecretsModule],
  providers: [EvmWeb3Provider],
  exports: [EvmWeb3Provider],
})
export class EvmWeb3Module {}
