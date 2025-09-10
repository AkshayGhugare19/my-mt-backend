import { Global, Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { RealtimeController } from './realtime.controller';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [UserModule],
  providers: [RealtimeService, RealtimeController],
  exports: [RealtimeService],
  controllers: [RealtimeController],
})
@Global()
export class RealtimeModule {}
