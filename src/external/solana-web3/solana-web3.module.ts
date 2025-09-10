import { SecretsModule } from '@infrastructure/secrets/secrets.module';
import { Module } from '@nestjs/common';
import { SolanaWeb3Provider } from './provider';

@Module({
  imports: [SecretsModule],
  providers: [SolanaWeb3Provider],
  exports: [SolanaWeb3Provider],
})
export class SolanaWeb3Module {}
