import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { PokerCodesController } from './controller/poker-codes.controller';
import { PokerCodesService } from './service/poker-codes.service';
import { PokerCodeJobProducer } from './job/producer/poker-code-job.producer';
import { PokerCodeJobConsumer } from './job/consumer/poker-code-job.consumer';
import { BullModule } from '@nestjs/bull';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { UserModule } from '@modules/user/user.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: QueuesDefinition.POKER_CODE_DISTRIBUTION_QUEUE.name,
    }),
    UserModule,
  ],
  providers: [PokerCodesService, PokerCodeJobProducer, PokerCodeJobConsumer],
  exports: [PokerCodesService],
  controllers: [PokerCodesController],
})
export class PokerCodesModule {}
