import { Module } from '@nestjs/common';
import { Modules } from '@modules/index';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';
import { ExternalModule } from './external/external.module';

@Module({
  imports: [ExternalModule, InfrastructureModule, Modules],
  providers: [],
})
export class AppModule {}
