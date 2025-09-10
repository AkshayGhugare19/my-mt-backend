import { Module } from '@nestjs/common';
import { TronWatcherProducer } from './producer/tron-watcher.producer';
import { DepositTransactionModule } from '@modules/deposits/deposit-transaction.module';
import { TransactionLedgerModule } from '@modules/transaction-ledger/transaction-ledger.module';
import { DepositsConsumer } from './consumer/deposits.consumer';
import { UserModule } from '@modules/user/user.module';
import { WithdrawConsumer } from './consumer/withdraw.consumer';
import { WithdrawalModule } from '@modules/withdrawal/withdrawal.module';
import { DepositModule } from '@modules/deposits/deposit.module';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { GamesModule } from '@modules/games/games.module';
import { SecretsModule } from '@infrastructure/secrets/secrets.module';
import { RedlockModule } from '@infrastructure/lock/redlock.module';
import { SolanaTransfersProducer } from './producer/solana-transfers.producer';
import { ExchangeRateCron } from './producer/exchange-rate.cron';
import { SolanafmModule } from '@external/solanafm/solanafm.module';
import { BinanceModule } from '@external/binance/binance.module';
import { EthereumTransfersProducer } from './producer/ethereum-transfers.producer';
import { AlchemyModule } from '@external/alchemy/alchemy.module';
import { SolanaWeb3Module } from '@external/solana-web3/solana-web3.module';
import { EvmWeb3Module } from '@external/evm-web3/evm-web3.module';
import { PartnerMatrixModule } from '@external/partner-matrix/partner-matrix.module';
import { PartnerMatrixCron } from './producer/partner-matrix.cron';
import { WalletManagerCron } from './producer/wallet-manager.cron';
import { ParametersModule } from '@infrastructure/parameters/parameters.module';
import { GamanzaProducer } from './producer/gamanza.producer';
import { GamanzaEngageModule } from '@external/gamanza-engage/gamanza-engage.module';
import { BullModule } from '@nestjs/bull';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { GamanzaConsumer } from './consumer/gamanza.consumer';
import { BonusModule } from '@modules/bonus/bonus.module';
import { TatumModule } from '@external/tatum/tatum.module';
import { BetManagerCron } from './producer/bet-manager.cron';
import { HttpModule } from '@nestjs/axios';
import { BalanceModule } from '@modules/balance/balance.module';
import { CronJobManagerController } from '@infrastructure/cron-jobs/controller/cron-job-manager.controller';
import { RealtimeModule } from '@infrastructure/realtime/realltime.module';
import { SolscanModule } from '@external/solscan/solscan.module';

@Module({
  imports: [
    HttpModule.register({}),
    BalanceModule,
    DepositTransactionModule,
    TransactionLedgerModule,
    UserModule,
    WithdrawalModule,
    DepositModule,
    PrismaModule,
    GamesModule,
    SecretsModule,
    RedlockModule,
    SolanafmModule,
    BinanceModule,
    AlchemyModule,
    SolanaWeb3Module,
    EvmWeb3Module,
    PartnerMatrixModule,
    ParametersModule,
    GamanzaEngageModule,
    BullModule.registerQueue(QueuesDefinition.GAMANZA_QUEUE),
    BonusModule,
    TatumModule,
    RealtimeModule,
    SolscanModule
  ],
  controllers: [CronJobManagerController],
  providers: [
    TronWatcherProducer,
    DepositsConsumer,
    WithdrawConsumer,
    SolanaTransfersProducer,
    ExchangeRateCron,
    EthereumTransfersProducer,
    PartnerMatrixCron,
    WalletManagerCron,
    GamanzaProducer,
    GamanzaConsumer,
    BetManagerCron
  ],
})
export class CronJobsModule {}
