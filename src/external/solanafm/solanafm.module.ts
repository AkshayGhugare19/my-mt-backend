import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SolanafmApi } from './api';
import { SecretsModule } from '@infrastructure/secrets/secrets.module';

@Module({
  imports: [HttpModule, SecretsModule],
  providers: [SolanafmApi],
  exports: [SolanafmApi],
})
export class SolanafmModule {}
