/* eslint-disable sonarjs/cognitive-complexity */
import { ONE_MINUTE_IN_MS } from '@common/constants';
import { SOLANA_DEPOSIT_PUBLIC_KEY_SECRET } from '@infrastructure/secrets/config';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { DepositTransactionService } from '@modules/deposits/service/deposit-transaction.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import Redlock, { Lock } from 'redlock';
import { DepositTransactionCurrency } from '@infrastructure/database/prisma/constants';
import {
  SOLANA_LAMPORTS_DECIMALS,
  SOLANA_USDC_DECIMALS,
  SOLANA_USDT_DECIMALS,
} from '@external/solana-web3/constants';
import { Decimal } from '@prisma/client/runtime/library';
import { formatTimestamp } from '@utils/format-timestamp';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';
import { SolscanApi } from '@external/solscan/solscan.api';

@Injectable()
export class SolanaTransfersProducer {
  private _logger = new Logger(SolanaTransfersProducer.name);
  private usdtContractAddress: string;
  private usdcContractAddress: string;
  private solAddress = 'So11111111111111111111111111111111111111111';

  constructor(
    private readonly redlock: Redlock,
    private readonly secretsService: SecretsService,
    private readonly solscanApi: SolscanApi,
    @InjectRedis() private readonly redis: Redis,
    private depositTransactionService: DepositTransactionService,
    private readonly configService: ConfigService,
  ) {
    this.usdtContractAddress = this.configService.getOrThrow<string>(
      ENV.SOLANA_USDT_CONTRACT_ADDRESS,
    );

    this.usdcContractAddress = this.configService.getOrThrow<string>(
      ENV.SOLANA_USDC_CONTRACT_ADDRESS,
    );
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async synchronizeTransfers(): Promise<any> {
    if (this.configService.get(ENV.DISABLE_TRANSFERS_PRODUCER_SOLANA)) {
      return;
    }

    let lock: Lock;

    try {
      lock = await this.redlock.acquire(
        ['cron:solana-transfers-sync'],
        ONE_MINUTE_IN_MS,
        {
          retryCount: 0,
        },
      );
    } catch (error) {
      return;
    }

    try {
      const depositAddress = await this.secretsService.getSecret(
        SOLANA_DEPOSIT_PUBLIC_KEY_SECRET,
      );

      if (!depositAddress) {
        return;
      }

      const latestTransferTimestamp = Number(
        (await this.redis.get(depositAddress)) ?? '0',
      );

      if (Number.isNaN(latestTransferTimestamp)) {
        throw new Error('Invalid timestamp');
      }

      this._logger.log(`Getting new solana transfers for ${depositAddress} from ${latestTransferTimestamp}`);

      const newTransfers = await this.solscanApi.getInboundTransfers(depositAddress, latestTransferTimestamp);
      this._logger.log(`Found ${newTransfers.length} new solana transfers`);

      const filteredTransfers = newTransfers.filter((transfer) => {
        if (transfer.to_address !== depositAddress) {
          return false;
        }

        if (transfer.token_address !== this.usdtContractAddress && transfer.token_address !== this.usdcContractAddress && transfer.token_address !== this.solAddress) {
          return false;
        }

        // eslint-disable-next-line sonarjs/prefer-single-boolean-return
        if (transfer.block_time <= latestTransferTimestamp) {
          return false;
        }

        return true;
      });
      this._logger.log(`Filtered ${filteredTransfers.length} new solana transfers`);

      for (let i = filteredTransfers.length - 1; i >= 0; i--) {
        const transfer = filteredTransfers[i];

        await this.depositTransactionService.enqueueSolanaTransferJob({
          currency:
            transfer.token_address === this.usdtContractAddress
              ? DepositTransactionCurrency.Usdt
              : transfer.token_address === this.usdcContractAddress
                ? DepositTransactionCurrency.Usdc
                : DepositTransactionCurrency.Solana,
          amount:
            transfer.token_address === this.usdtContractAddress
              ? new Decimal(transfer.amount).div(
                10 ** SOLANA_USDT_DECIMALS,
              )
              : transfer.token_address === this.usdcContractAddress
                ? new Decimal(transfer.amount).div(
                  10 ** SOLANA_USDC_DECIMALS,
                )
                : new Decimal(transfer.amount).div(
                  10 ** SOLANA_LAMPORTS_DECIMALS,
                ),

          senderAddress: transfer.from_address,
          receiverAddress: transfer.to_address,

          blockNumber: formatTimestamp(transfer.block_time),
          blockTimestamp: formatTimestamp(transfer.block_time),
          transactionSignature: filteredTransfers[i].trans_id,

          raw: transfer,
        });

        await this.redis.set(depositAddress, transfer.block_time);
      }
    } catch (error) {
      this._logger.error(
        {
          error: error.message,
          stack: error.stack,
          message: 'Error while fetching transfers',
        },
        'start',
      );
    } finally {
      if (lock) await lock.release();
    }
  }
}
