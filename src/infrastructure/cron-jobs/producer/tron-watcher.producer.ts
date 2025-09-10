import { ONE_MINUTE_IN_MS } from '@common/constants';
import { ENV } from '@common/env';
import { TRON_DEPOSIT_PUBLIC_KEY_SECRET } from '@infrastructure/secrets/config';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { TronWatchService } from '@modules/deposits/providers/tron-watcher.provider';
import { DepositTransactionService } from '@modules/deposits/service/deposit-transaction.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redlock, { Lock } from 'redlock';

@Injectable()
export class TronWatcherProducer {
  private readonly _logger = new Logger(TronWatcherProducer.name);
  constructor(
    private depositTransactionService: DepositTransactionService,
    private readonly tronWatchService: TronWatchService,
    private readonly secretsService: SecretsService,
    private readonly redlock: Redlock,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async start(): Promise<any> {
    if (this.configService.get(ENV.DISABLE_TRANSFERS_PRODUCER_TRON)) {
      return;
    }

    let lock: Lock;
    try {
      lock = await this.redlock.acquire(
        ['cron:tron-deposit'],
        ONE_MINUTE_IN_MS,
        {
          retryCount: 0,
        },
      );
    } catch (error) {
      this._logger.error(
        {
          message: 'Error while acquiring lock',
        },
        'update',
      );
      return;
    }

    try {
      const depositAddress = await this.secretsService.getSecret(
        TRON_DEPOSIT_PUBLIC_KEY_SECRET,
      );

      if (!depositAddress) {
        return;
      }

      const txs = await this.tronWatchService.getLatestTransactionsOfAddress({
        address: depositAddress,
      });

      if (txs.length) this._logger.log({ txs }, 'TronWatcherProducer.start');

      for (const tx of txs) {
        this.depositTransactionService.enqueueTronTransferJob(tx);
      }
    } catch (error) {
      this._logger.error(
        {
          error: error.message,
          stack: error.stack,
          message: 'Error while fetching transactions',
        },
        'start',
      );
    } finally {
      if (lock) await lock.release();
    }
  }
}
