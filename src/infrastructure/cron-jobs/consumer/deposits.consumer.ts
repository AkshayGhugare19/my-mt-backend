/* eslint-disable sonarjs/no-duplicate-string */
import { USDC_PRICE, USDT_PRICE } from '@common/constants';
import { ENV } from '@common/env';
import {
  Blockchain,
  DepositTransactionCurrency,
  NotificationCodes,
} from '@infrastructure/database/prisma/constants';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { DepositTransactionService } from '@modules/deposits/service/deposit-transaction.service';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionStatuses } from '@modules/transaction-ledger/enum/status.enum';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Job } from 'bull';
import Redis from 'ioredis';
import { TransferJob, TronUSDTokenTransferJob } from '../producer/types';
import { TronFeesService } from '@modules/deposits/service/tron-fees.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  REDIS_KEY__BINANCE_ETH_USDT,
  REDIS_KEY__BINANCE_SOL_USDT,
  REDIS_KEY__BINANCE_TRX_USDT,
  REDIS_KEY__DEPOSIT_SKIP_LIST
} from '@infrastructure/redis/keys';
import { UserDepositService } from '@modules/deposits/service/user-deposit.service';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { pointsToUsd } from '@utils/points-to-usd';
import { decimalToFixed } from '@utils/decimal-to-fixed';

@Processor(QueuesDefinition.DEPOSITS_QUEUE.name ?? '')
export class DepositsConsumer {
  private readonly _logger = new Logger(DepositsConsumer.name);

  constructor(
    private configService: ConfigService,
    private depositTransactionService: DepositTransactionService,
    private transactionLedgerService: TransactionLedgerService,
    private tronFeesService: TronFeesService,
    private readonly userDepositService: UserDepositService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
    @InjectRedis() private redis: Redis,
  ) {}

  @OnQueueActive()
  public onActive(job: Job): any {
    // this._logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  public onComplete(job: Job): any {
    // this._logger.debug(`Completed job ${job.id} of type ${job.name}`);
  }

  @OnQueueFailed()
  public onError(job: Job<any>, error: any): any {
    this._logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }

  @Process(JOB.TRON_TRANSFER)
  async processTronTransfer(job: Job<TransferJob>): Promise<any> {
    const userWallet = await this.userDepositService.getByWallet(
      job.data.senderAddress,
    );

    if (!userWallet) {
      throw new Error("Wallet wasn't found in database");
    }

    const usdtToPoints = this.configService.getOrThrow<number>(ENV.USD_POINTS);
    const usdcToPoints = this.configService.getOrThrow<number>(ENV.USD_POINTS);

    let usdAmount: Decimal;
    let pointsAmount: Decimal;

    switch (job.data.currency) {
      case DepositTransactionCurrency.Usdt: {
        usdAmount = new Decimal(job.data.amount);
        pointsAmount = new Decimal(job.data.amount).mul(usdtToPoints);
        break;
      }
      case DepositTransactionCurrency.Usdc: {
        usdAmount = new Decimal(job.data.amount);
        pointsAmount = new Decimal(job.data.amount).mul(usdcToPoints);
        break;
      }
      case DepositTransactionCurrency.Trx: {
        const exchangeRate =
          // The USDT/USDC parity is close to 1:1. The disparity is negligible.
          (await this.redis.get(REDIS_KEY__BINANCE_TRX_USDT)) ||
          ((): never => {
            throw new Error('Exchange rate not updated');
          })();

        usdAmount = new Decimal(job.data.amount).mul(exchangeRate);
        pointsAmount = usdAmount.mul(usdtToPoints);

        break;
      }
      default: {
        throw new Error('Points amount could not be calculated');
      }
    }

    const depositTransaction = await this.depositTransactionService.create({
      amount: job.data.amount,
      currency: job.data.currency,
      blockchain: Blockchain.Tron,
      usdAmount,

      sender: job.data.senderAddress,
      receiver: job.data.receiverAddress,

      blockNumber: job.data.blockTimestamp,
      blockTimestamp: job.data.blockTimestamp,
      transactionId: job.data.transactionSignature,

      raw: job.data.raw,
      status: 'success',
    });

    const depositSkipList = await this.redis.hget(REDIS_KEY__DEPOSIT_SKIP_LIST, userWallet.userId)
    if (depositSkipList) {
      this._logger.debug(`Skipping deposit for user ${userWallet.userId} because it's in the skip list`);
      await this.redis.hdel(REDIS_KEY__DEPOSIT_SKIP_LIST, userWallet.userId)
      return;
    }

    await this.transactionLedgerService.createDeposit({
      userId: userWallet.userId,
      amount: pointsAmount,
      operationType: TransactionOperationTypes.CREDIT,
      counterParty: TransactionCounterParties.DEPOSIT_SERVICE,
      referenceId: depositTransaction.id,
      status: TransactionStatuses.SUCCESS,
    });

    this.realtimeService.pushMessageToUser(userWallet.userId, {
      type: 'deposit',
      amount: pointsAmount.toNumber(),
      currency: job.data.currency,
      blockchain: Blockchain.Tron,
    }).catch((err) => {
      this._logger.error('Error pushing deposit message to user', err);
    });

    await this.notificationsService.createNotification(userWallet.userId, NotificationCodes.DEPOSIT_SUCCESS, {}, {
      amount: job.data.currency === DepositTransactionCurrency.Usdt || job.data.currency === DepositTransactionCurrency.Usdc ? `${job.data.amount} USD` : `${decimalToFixed(new Decimal(job.data.amount), 5)} TRX (${decimalToFixed(new Decimal(pointsToUsd(pointsAmount.toNumber())), 3)} USD)`,
    });
  }

  async getUSDTPrice(): Promise<any> {
    return (await this.redis.get(USDT_PRICE)) ?? 1;
  }

  async getUSDCPrice(): Promise<any> {
    return (await this.redis.get(USDC_PRICE)) ?? 1;
  }

  @Process(JOB.SOLANA_TRANSFER)
  async processSolanaTransfer(job: Job<TransferJob>): Promise<void> {
    const userWallet = await this.userDepositService.getByWallet(
      job.data.senderAddress,
    );

    if (!userWallet) {
      throw new Error("Wallet wasn't found in database");
    }

    const usdtToPoints = this.configService.getOrThrow<number>(ENV.USD_POINTS);
    const usdcToPoints = this.configService.getOrThrow<number>(ENV.USD_POINTS);

    let usdAmount: Decimal;
    let pointsAmount: Decimal;
    switch (job.data.currency) {
      case DepositTransactionCurrency.Usdt: {
        usdAmount = new Decimal(job.data.amount);
        pointsAmount = new Decimal(job.data.amount).mul(usdtToPoints);
        break;
      }
      case DepositTransactionCurrency.Usdc: {
        usdAmount = new Decimal(job.data.amount);
        pointsAmount = new Decimal(job.data.amount).mul(usdcToPoints);
        break;
      }
      case DepositTransactionCurrency.Solana: {
        const exchangeRate =
          (await this.redis.get(REDIS_KEY__BINANCE_SOL_USDT)) ||
          ((): never => {
            throw new Error('Exchange rate not updated');
          })();

        usdAmount = new Decimal(job.data.amount).mul(exchangeRate);
        pointsAmount = usdAmount.mul(usdtToPoints);

        break;
      }
      default: {
        throw new Error('Points amount could not be calculated');
      }
    }

    const depositTransaction = await this.depositTransactionService.create({
      amount: job.data.amount,
      currency: job.data.currency,
      blockchain: Blockchain.Solana,
      usdAmount,

      sender: job.data.senderAddress,
      receiver: job.data.receiverAddress,

      blockNumber: job.data.blockTimestamp,
      blockTimestamp: job.data.blockTimestamp,
      transactionId: job.data.transactionSignature,

      raw: job.data.raw,
      status: 'success',
    });

    const depositSkipList = await this.redis.hget(REDIS_KEY__DEPOSIT_SKIP_LIST, userWallet.userId)
    if (depositSkipList) {
      this._logger.debug(`Skipping deposit for user ${userWallet.userId} because it's in the skip list`);
      await this.redis.hdel(REDIS_KEY__DEPOSIT_SKIP_LIST, userWallet.userId)
      return;
    }

    await this.transactionLedgerService.createDeposit({
      userId: userWallet.userId,
      amount: pointsAmount,
      operationType: TransactionOperationTypes.CREDIT,
      counterParty: TransactionCounterParties.DEPOSIT_SERVICE,
      referenceId: depositTransaction.id,
      status: TransactionStatuses.SUCCESS,
    });

    this.realtimeService.pushMessageToUser(userWallet.userId, {
      type: 'deposit',
      amount: pointsAmount.toNumber(),
      currency: job.data.currency,
      blockchain: Blockchain.Solana,
    }).catch((err) => {
      this._logger.error('Error pushing deposit message to user', err);
    });

    await this.notificationsService.createNotification(userWallet.userId, NotificationCodes.DEPOSIT_SUCCESS, {}, {
      amount: job.data.currency === DepositTransactionCurrency.Usdt || job.data.currency === DepositTransactionCurrency.Usdc ? `${job.data.amount} USD` : `${decimalToFixed(new Decimal(job.data.amount), 5)} SOL (${decimalToFixed(new Decimal(pointsToUsd(pointsAmount.toNumber())), 3)} USD)`,
    });
  }

  @Process(JOB.ETHEREUM_TRANSFER)
  async processEthereumTransfer(job: Job<TransferJob>): Promise<void> {
    const userWallet = await this.userDepositService.getByWallet(
      job.data.senderAddress,
    );

    if (!userWallet) {
      throw new Error("Wallet wasn't found in database");
    }

    const usdtToPoints = this.configService.getOrThrow<number>(ENV.USD_POINTS);
    const usdcToPoints = this.configService.getOrThrow<number>(ENV.USD_POINTS);

    let usdAmount: Decimal;
    let pointsAmount: Decimal;
    switch (job.data.currency) {
      case DepositTransactionCurrency.Usdt: {
        usdAmount = new Decimal(job.data.amount);
        pointsAmount = new Prisma.Decimal(job.data.amount).mul(usdtToPoints);
        break;
      }
      case DepositTransactionCurrency.Usdc: {
        usdAmount = new Decimal(job.data.amount);
        pointsAmount = new Decimal(job.data.amount).mul(usdcToPoints);
        break;
      }
      case DepositTransactionCurrency.Ethereum: {
        const exchangeRate =
          (await this.redis.get(REDIS_KEY__BINANCE_ETH_USDT)) ||
          ((): never => {
            throw new Error('Exchange rate not updated');
          })();

        usdAmount = new Decimal(job.data.amount).mul(exchangeRate);
        pointsAmount = usdAmount.mul(usdtToPoints);

        break;
      }
      default: {
        throw new Error('Points amount could not be calculated');
      }
    }

    const depositTransaction = await this.depositTransactionService.create({
      amount: job.data.amount,
      currency: job.data.currency,
      blockchain: Blockchain.Ethereum,
      usdAmount,

      sender: job.data.senderAddress,
      receiver: job.data.receiverAddress,

      blockNumber: job.data.blockTimestamp,
      blockTimestamp: job.data.blockTimestamp,
      transactionId: job.data.transactionSignature,

      raw: job.data.raw,
      status: 'success',
    });

    const depositSkipList = await this.redis.hget(REDIS_KEY__DEPOSIT_SKIP_LIST, userWallet.userId)
    if (depositSkipList) {
      this._logger.debug(`Skipping deposit for user ${userWallet.userId} because it's in the skip list`);
      await this.redis.hdel(REDIS_KEY__DEPOSIT_SKIP_LIST, userWallet.userId)
      return;
    }

    await this.transactionLedgerService.createDeposit({
      userId: userWallet.userId,
      amount: pointsAmount,
      operationType: TransactionOperationTypes.CREDIT,
      counterParty: TransactionCounterParties.DEPOSIT_SERVICE,
      referenceId: depositTransaction.id,
      status: TransactionStatuses.SUCCESS,
    });

    this.realtimeService.pushMessageToUser(userWallet.userId, {
      type: 'deposit',
      amount: pointsAmount.toNumber(),
      currency: job.data.currency,
      blockchain: Blockchain.Ethereum,
    }).catch((err) => {
      this._logger.error('Error pushing deposit message to user', err);
    });

    await this.notificationsService.createNotification(userWallet.userId, NotificationCodes.DEPOSIT_SUCCESS, {}, {
      amount: job.data.currency === DepositTransactionCurrency.Usdt || job.data.currency === DepositTransactionCurrency.Usdc ? `${job.data.amount} USD` : `${decimalToFixed(new Decimal(job.data.amount), 5)} ETH (${decimalToFixed(new Decimal(pointsToUsd(pointsAmount.toNumber())), 3)} USD)`,
    });
  }

  @Process(JOB.TRON_TOKEN_TRANSFER)
  async processTronTokenTransfer(job: Job<TronUSDTokenTransferJob>): Promise<void | string> {
    const MIN_ENERGY_FOR_TX = 35_000;
    const JOB_DELAY = 10_000; // 10 seconds

    switch (job.data.state) {
      case 'pending': {
        // 1. compute the amount of TRX needed to pay the fees
        const bandwidthForTx =
          await this.tronFeesService.estimateNeededBandwidthForEncodedPresignedTransaction(
            job.data.presignedTx,
          );

        const neededTrx = await this.tronFeesService.calculateTrxFee(
          job.data.address,
          bandwidthForTx,
          MIN_ENERGY_FOR_TX,
        );

        // 2. send fees to the user
        const feesTx = await this.tronFeesService.sendTrx(
          job.data.address,
          30, // TODO: replace with neededTrx,
        );

        // 3. update the job state to 'wait-for-fees'
        await this.depositTransactionService.enqueueTronUSDTokenTransferJob(
          {
            ...job.data,
            state: 'wait-for-fees',
            feesTxId: feesTx.transaction.txID,
            feesValue: neededTrx,
          },
          JOB_DELAY,
        );
        return feesTx.transaction.txID;
      }
      case 'wait-for-fees': {
        // 1. check if the fees transaction is confirmed
        const txStatus = await this.tronFeesService.getTransactionStatus(
          job.data.feesTxId,
        );

        if (txStatus === 'FAILED') {
          this._logger.debug(
            `Fees transaction failed for ${job.data.address}. Won't retry.`,
          );
          break;
        }

        // 1.a id pending, schedule the same job execution
        if (txStatus === 'PENDING') {
          await this.depositTransactionService.enqueueTronUSDTokenTransferJob(
            job.data,
            JOB_DELAY,
          );
          break;
        }

        // 1.b if confirmed, send the presigned transaction and update the job state to 'wait-for-transaction'
        const tx = await this.tronFeesService.sendEncodedPresignedTransaction(
          job.data.presignedTx,
        );
        this._logger.debug(
          `Sent presigned transaction for ${job.data.address}: ${tx.transaction.txID}`,
        );

        // we don't need to wait for the transaction to be confirmed
        // await this.depositTransactionService.enqueueTronUsdtTransferJob(
        //   {
        //     ...job.data,
        //     state: 'wait-for-transfer',
        //     transferTxId: tx.transaction.txID,
        //   },
        //   JOB_DELAY,
        // );

        break;
      }

      case 'wait-for-transfer': {
        // 1. check if the transaction is confirmed
        const txStatus = await this.tronFeesService.getTransactionStatus(
          job.data.transferTxId,
        );

        this._logger.debug(
          `Transfer transaction status for ${job.data.address}: ${txStatus}`,
        );

        if (txStatus === 'FAILED') {
          this._logger.debug(
            `Transfer transaction failed for ${job.data.address}. Won't retry.`,
          );
          break;
        }

        // 1.a if confirmed, we are done.
        if (txStatus === 'CONFIRMED') {
          this._logger.debug(
            `Transfer transaction confirmed for ${job.data.address}`,
          );
          break;
        }

        // 1.b if not confirmed, schedule the same job execution
        this._logger.debug(
          `Transfer transaction pending for ${job.data.address}. Will retry in ${JOB_DELAY} ms`,
        );

        await this.depositTransactionService.enqueueTronUSDTokenTransferJob(
          job.data,
          JOB_DELAY,
        );

        break;
      }
    }
  }
}
