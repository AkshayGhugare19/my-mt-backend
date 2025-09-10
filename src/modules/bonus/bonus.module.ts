import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { RabbitMQModule } from '@infrastructure/queue/rabbitmq';
import { BonusAdminController } from '@modules/bonus/controller/bonus-admin.controller';
import { BonusController } from '@modules/bonus/controller/bonus.controller';
import { ConsumerHandler } from '@modules/bonus/handlers/consumer/handler';
import { ProducerEventHandler } from '@modules/bonus/handlers/producer-event-handler';
import { BetParserModule } from '@modules/bonus/handlers/strategy';
import { BonusTriggerStrategies } from '@modules/bonus/handlers/strategy/bonus-trigger-strategies';
import {
  AdminManualProducerStrategy,
  CashbackProducerStrategy,
  DepositProducerStrategy,
} from '@modules/bonus/handlers/strategy/producer';
import {
  BetSettlementProgressStrategy,
  TargetValidators,
} from '@modules/bonus/handlers/strategy/progress';
import { BonusJobConsumer } from '@modules/bonus/job/consumer/bonus-job.consumer';
import { BonusJobProducer } from '@modules/bonus/job/producer/bonus-job.producer';
import { BonusBalanceService } from '@modules/bonus/service/bonus-balance.service';
import { BonusNotificationService } from '@modules/bonus/service/bonus-notification.service';
import { BonusProgressionService } from '@modules/bonus/service/bonus-progression.service';
import { BonusTriggerService } from '@modules/bonus/service/bonus-trigger.service';
import { BonusService } from '@modules/bonus/service/bonus.service';
import { PermissionModule } from '@modules/permission/permission.module';
import { RoleModule } from '@modules/role/role.module';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { BonusCronService } from './cron/cron.service';
import { RakebackProducer } from './job/producer/rakeback.producer';
import { BetRollbackScoringStrategy } from '@modules/bonus/handlers/consumer/strategy/rollback-scoring.strategy';
import { DefaultScoreStrategy } from '@modules/bonus/handlers/consumer/strategy/default-score.strategy';
import { UserConfigModule } from '@modules/user-config/user-config.module';
import { AsyncLogModule } from '@infrastructure/log/async-log.module';
import { WageringBetConsumer } from '@modules/bonus/job/consumer/wagering/wagering-bet.consumer';
import { WageringProgressConsumer } from '@modules/bonus/job/consumer/wagering/wagering-progress.consumer';
import { WageringProgressCronProducer } from '@modules/bonus/job/producer/wagering/cron.producer';
import { WageringProgressProducer } from '@modules/bonus/job/producer/wagering/progress.producer';

@Module({
  imports: [
    PrismaModule,
    RabbitMQModule,
    BetParserModule,
    TransactionLedgerModule,
    BullModule.registerQueue({ name: QueuesDefinition.BONUS_QUEUE.name }),
    BullModule.registerQueue(QueuesDefinition.WAGERING_BET_QUEUE),
    BullModule.registerQueue(QueuesDefinition.WAGERING_PROGRESS_QUEUE),
    PermissionModule,
    UserConfigModule,
    RoleModule,
    AsyncLogModule,
  ],
  controllers: [BonusAdminController, BonusController],
  providers: [
    BonusJobProducer,
    RakebackProducer,
    WageringProgressCronProducer,
    WageringProgressProducer,
    BonusJobConsumer,
    WageringBetConsumer,
    WageringProgressConsumer,

    TargetValidators,
    AdminManualProducerStrategy,
    CashbackProducerStrategy,
    DepositProducerStrategy,
    BetSettlementProgressStrategy,
    ProducerEventHandler,
    ConsumerHandler,
    DefaultScoreStrategy,
    BetRollbackScoringStrategy,
    BonusCronService,

    // external
    BonusService,
    BonusTriggerService,
    BonusTriggerStrategies,
    BonusProgressionService,
    BonusBalanceService,
    BonusNotificationService,
  ],
  exports: [
    BonusService,
    BonusTriggerService,
    BonusProgressionService,
    BonusBalanceService,
    BonusNotificationService,
    ProducerEventHandler,
    BonusTriggerStrategies,
    TargetValidators,
  ],
})
export class BonusModule {}
