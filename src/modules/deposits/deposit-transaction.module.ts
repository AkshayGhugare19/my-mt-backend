import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { DepositTransactionService } from './service/deposit-transaction.service';
import { BullModule } from '@nestjs/bull';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { SecretsModule } from '@infrastructure/secrets/secrets.module';
import { SolanaWeb3Module } from '@external/solana-web3/solana-web3.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: QueuesDefinition.DEPOSITS_QUEUE.name }),
    SecretsModule,
    SolanaWeb3Module,
  ],
  controllers: [],
  providers: [DepositTransactionService],
  exports: [DepositTransactionService],
})
export class DepositTransactionModule {}
