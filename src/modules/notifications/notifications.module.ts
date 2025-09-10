import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { RealtimeModule } from '@infrastructure/realtime/realltime.module';
import { Global, Module } from '@nestjs/common';
import { UserNotificationsController } from './controllers/user-notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsEvents } from './notifications.events';
import { BalanceModule } from '@modules/balance/balance.module';
import { PushSubscriptionModule } from '@modules/notifications/push-subscription/module';

@Module({
  imports: [PrismaModule, RealtimeModule, BalanceModule, PushSubscriptionModule],
  providers: [NotificationsService, NotificationsEvents],
  controllers: [UserNotificationsController],
  exports: [NotificationsService]
})
@Global()
export class NotificationsModule {

}
