import { Module } from '@nestjs/common';
import { SetSecretCommand } from './set-secret.command';
import { SecretsModule } from '@infrastructure/secrets/secrets.module';

@Module({
  imports: [SecretsModule],
  providers: [SetSecretCommand],
  exports: [SetSecretCommand],
})
export class SetSecretModule {}
