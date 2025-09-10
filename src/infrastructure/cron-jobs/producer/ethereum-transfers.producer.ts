import { ONE_MINUTE_IN_MS } from '@common/constants';
import { ETHEREUM_DEPOSIT_PUBLIC_KEY_SECRET } from '@infrastructure/secrets/config';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { AlchemyApi } from '@external/alchemy/api';
import { DepositTransactionService } from '@modules/deposits/service/deposit-transaction.service';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import Redlock, { Lock } from 'redlock';
import {
  Blockchain,
  DepositTransactionCurrency,
} from '@infrastructure/database/prisma/constants';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/library';
import { formatTimestamp } from '@utils/format-timestamp';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';

@Injectable()
export class EthereumTransfersProducer {
  private logger = new Logger(EthereumTransfersProducer.name);
  private usdtContractAddress: string;
  private usdcContractAddress: string;

  constructor(
    private readonly redlock: Redlock,
    private readonly secretsService: SecretsService,
    private readonly alchemyApi: AlchemyApi,
    @InjectRedis() private readonly redis: Redis,
    private depositTransactionService: DepositTransactionService,
    private readonly configService: ConfigService,
  ) {
    this.usdtContractAddress = this.configService.getOrThrow<string>(
      ENV.ETHEREUM_USDT_CONTRACT_ADDRESS,
    );
    this.usdcContractAddress = this.configService.getOrThrow<string>(
      ENV.ETHEREUM_USDC_CONTRACT_ADDRESS,
    );
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async synchronizeTransfers(): Promise<any> {
    if (this.configService.get(ENV.DISABLE_TRANSFERS_PRODUCER_ETHEREUM)) {
      return;
    }

    let lock: Lock;

    try {
      lock = await this.redlock.acquire(
        ['cron:ethereum-transfers-sync'],
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
        ETHEREUM_DEPOSIT_PUBLIC_KEY_SECRET,
      );

      if (!depositAddress) {
        return;
      }

      const latestBlock = (await this.redis.get(depositAddress)) ?? undefined;

      let pageKey: string | undefined;
      const newTransfers = [];
      while (true) {
        const newTransfersChunk = await this.alchemyApi.getAssetTransfers({
          id: 1,
          jsonrpc: '2.0',
          method: 'alchemy_getAssetTransfers',
          params: [
            {
              fromBlock: latestBlock,
              toBlock: 'latest',
              toAddress: depositAddress,
              order: 'asc',
              withMetadata: true,
              excludeZeroValue: true,
              maxCount: '0x3e8',
              category: ['erc20', 'erc721', 'external', 'internal'],
              contractAddresses: [this.usdtContractAddress, this.usdcContractAddress],
              pageKey,
            },
          ],
        });

        if (!newTransfersChunk?.result?.transfers) break;

        const filteredTransfers = newTransfersChunk.result.transfers.filter(
          (transfer) => {
            const blockTimestamp = formatTimestamp(Number(transfer.blockNum));
            const latestBlockTimestamp = formatTimestamp(Number(latestBlock ?? 0));

            return blockTimestamp > latestBlockTimestamp;
          },
        );

        newTransfers.push(...filteredTransfers);

        if (!newTransfersChunk.result.pageKey) break;

        pageKey = newTransfersChunk.result.pageKey;
      }

      if (!newTransfers.length) {
        return;
      }

      const maxBlockTimestamp = newTransfers.reduce((max, transfer) => {
        return Math.max(max, formatTimestamp(
          Math.floor(
            new Date(transfer.metadata.blockTimestamp).getTime() / 1000,
          ),
        ));
      }, 0);

      const minBlockTimestamp = newTransfers.reduce((min, transfer) => {
        return Math.min(min, formatTimestamp(
          Math.floor(
            new Date(transfer.metadata.blockTimestamp).getTime() / 1000,
          ),
        ));
      }, Number.MAX_SAFE_INTEGER);

      const existingTransactions =
        await this.depositTransactionService.getExistingTransactions(
          minBlockTimestamp,
          maxBlockTimestamp,
          Blockchain.Ethereum,
        );

      const existingTransactionsSet = new Set(
        existingTransactions.map((transaction) => transaction.transactionId),
      );

      const newTransfersFiltered = newTransfers.filter(
        (transfer) => !existingTransactionsSet.has(transfer.hash),
      );

      for (const transfer of newTransfersFiltered) {
        await this.depositTransactionService.enqueueEthereumTransferJob({
          currency:
            transfer.asset === 'USDT'
              ? DepositTransactionCurrency.Usdt
              : transfer.asset === 'USDC'
                ? DepositTransactionCurrency.Usdc
                : DepositTransactionCurrency.Ethereum,
          amount: new Decimal(transfer.value),

          senderAddress: transfer.from,
          receiverAddress: transfer.to,

          blockNumber: formatTimestamp(Number(transfer.blockNum)),
          blockTimestamp: formatTimestamp(
            Math.floor(
              new Date(transfer.metadata.blockTimestamp).getTime() / 1000,
            ),
          ),

          transactionSignature: transfer.hash,

          raw: transfer,
        });
      }

      const maxBlockNumber = newTransfers.reduce((max, transfer) => {
        return Number(max) > Number(transfer.blockNum)
          ? max
          : transfer.blockNum;
      }, 0);

      await this.redis.set(depositAddress, maxBlockNumber);
    } catch (error) {
      this.logger.error(
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
