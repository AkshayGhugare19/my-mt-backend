import { Module, OnModuleInit } from '@nestjs/common';
import { SlotegratorTestController } from './controller/test.controller';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { SlotegratorService } from './service/slotegrator.service';
import { SlotegratorImporterCron } from './cron/importer.cron';
import { SlotegratorWebhookController } from './controller/webhook.controller';
import { SlotegratorSessionController } from './controller/session.controller';
import { SlotegratorError, SlotegratorErrorParser } from './error';
import { registerErrorParser } from '@common/error-filters/error-parsers';
import { BalanceModule } from '@modules/balance/balance.module';
import { BetModule } from '@modules/bet/bet.module';
import { GamesModule } from '@modules/games/games.module';
import { DepositModule } from '@modules/deposits/deposit.module';
import { SlotegratorConsumer } from './consumer/slotegrator.consumer';
import { SlotegratorProducer } from './producer/slotegrator.producer';
import { BullModule } from '@nestjs/bull';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';

@Module({
  imports: [
    PrismaModule,
    BalanceModule,
    BetModule,
    GamesModule,
    DepositModule,
    BullModule.registerQueue(QueuesDefinition.SPORTSBOOK_BETS_QUEUE),
  ],
  providers: [
    SlotegratorService,
    SlotegratorImporterCron,
    SlotegratorProducer,
    SlotegratorConsumer,
  ],
  exports: [SlotegratorService, SlotegratorProducer],
  controllers: [
    SlotegratorTestController,
    SlotegratorWebhookController,
    SlotegratorSessionController,
  ],
})
export class SlotegratorModule implements OnModuleInit {
  onModuleInit(): void {
    registerErrorParser(SlotegratorError.name, SlotegratorErrorParser);
  }
}
