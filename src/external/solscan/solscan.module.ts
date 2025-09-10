import { Module } from '@nestjs/common';
import { SolscanApi } from './solscan.api';
import { HttpModule } from '@nestjs/axios';
import { SecretsModule } from '@infrastructure/secrets/secrets.module';

@Module({
  imports: [HttpModule, SecretsModule],
  providers: [SolscanApi],
  exports: [SolscanApi],
})
export class SolscanModule {}
