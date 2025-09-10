import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { SecretsModule } from '@infrastructure/secrets/secrets.module';
import { DepositController } from '@modules/deposits/controller/deposits.controller';
import { TronWatcherProvider } from '@modules/deposits/providers/tron-watcher-config';
import { DepositService } from '@modules/deposits/service/deposit.service';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { SolanaWeb3Provider } from '@external/solana-web3/provider';
import { DepositsEventHandler } from './events/handler';
import { TronFeesService } from './service/tron-fees.service';
import { DepositTransactionModule } from './deposit-transaction.module';
import { TronTreasuryService } from './providers/tron-watcher.provider';
import { UserDepositService } from '@modules/deposits/service/user-deposit.service';
import { WalletModule } from '@modules/wallet/wallet.module';
import { Web3AuthModule } from '@modules/authentication/web3auth/web3auth.module';
import { UserModule } from '@modules/user/user.module';
import { DepositRepository } from '@modules/deposits/repository/deposit.repository';

@Module({
  imports: [
    PrismaModule,
    WalletModule,
    BullModule.registerQueue(QueuesDefinition.DEPOSITS_QUEUE),
    SecretsModule,
    DepositTransactionModule,
    Web3AuthModule,
    UserModule,
  ],
  controllers: [DepositController],
  providers: [
    UserDepositService,
    TronWatcherProvider,
    DepositService,
    SolanaWeb3Provider,
    DepositsEventHandler,
    TronFeesService,
    TronTreasuryService,
    DepositRepository
  ],
  exports: [
    TronWatcherProvider,
    DepositService,
    SolanaWeb3Provider,
    TronFeesService,
    TronTreasuryService,
    UserDepositService,
  ],
})
export class DepositModule {}
