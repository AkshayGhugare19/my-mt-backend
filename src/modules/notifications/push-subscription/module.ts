import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { PushSubscriptionController } from '@modules/notifications/push-subscription/controller/push-subscription.controller';
import { PushSubscriptionService } from '@modules/notifications/push-subscription/service/push-subscription.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  controllers: [PushSubscriptionController],
  providers: [PushSubscriptionService],
  exports: [PushSubscriptionService],
})
export class PushSubscriptionModule {}
