import { NotFoundError } from '@common/error/not-found.error';
import {
  Blockchain,
  NotificationCodes,
  WithdrawalRequestCurrency,
  getAmountInCurrencyString,
} from '@infrastructure/database/prisma/constants';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { TransactionStatuses } from '@modules/transaction-ledger/enum/status.enum';
import { WithdrawalService } from '@modules/withdrawal/service/withdrawal.service';
import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Job } from 'bull';
import { EvmWeb3Provider } from '@external/evm-web3/provider';
import { SolanaWeb3Provider } from '@external/solana-web3/provider';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { TronTreasuryService } from '@modules/deposits/providers/tron-watcher.provider';
import { Roles } from '@modules/role/enum/role.enum';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';
import { WithdrawalJobData } from '@modules/withdrawal/types';
import { RetryWithPriorityError } from '@external/solana-web3/errors/retry-with-priority.error';
import Redis from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { REDIS_KEY__BINANCE_SOL_USDC, REDIS_KEY__BINANCE_SOL_USDT } from '@infrastructure/redis/keys';
import { BalanceService } from '@modules/balance/service/balance.service';

@Processor(QueuesDefinition.WITHDRAW_QUEUE.name ?? '')
export class WithdrawConsumer {
  private readonly _logger = new Logger(WithdrawConsumer.name);

  constructor(
    private balanceService: BalanceService,
    private withdrawalService: WithdrawalService,
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly solanaWeb3Provider: SolanaWeb3Provider,
    private readonly evmWeb3Provider: EvmWeb3Provider,
    private readonly tronTreasuryService: TronTreasuryService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  @OnQueueActive()
  public onActive(job: Job): any {
    this._logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  public onComplete(job: Job): any {
    this._logger.debug(`Completed job ${job.id} of type ${job.name}`);
  }

  @OnQueueFailed()
  public async onError(job: Job<WithdrawalJobData>, error: any): Promise<any> {
    if (error instanceof RetryWithPriorityError) {
      const data = job.data;
      const priorityFeeData = data.withPriorityFee;

      const solUsdPrice = await this.redis.get(job.data.currency === WithdrawalRequestCurrency.Usdc ? REDIS_KEY__BINANCE_SOL_USDC : REDIS_KEY__BINANCE_SOL_USDT);

      if (!solUsdPrice) {
        this._logger.error(
          {
            message: 'solUsdPrice not found',
            currency: data.currency,
          },
          'WithdrawRequest.solUsdPriceNotFound',
        );
        return;
      }

      // if the priority fee data is not provided, we use the median priority fee
      if (!priorityFeeData) {
        job.update({
          ...data,
          withPriorityFee: {
            solUsdPrice: Number(solUsdPrice),
            priorityType: 'median',
          },
        });
      } else {
        job.update({
          ...data,
          withPriorityFee: {
            solUsdPrice: Number(solUsdPrice),
            priorityType: 'max',
          },
        });
      }

      // Wait for 1 second until the job is retried
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await job.retry();
      return;
    }
    this._logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }

  @Process(JOB.WITHDRAW_TRANSACTION_JOB)
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async processUserTransaction(job: Job<WithdrawalJobData>): Promise<any> {
    const {
      userId,
      amount,
      pointsAmount,
      currency,
      blockchain,
      withdrawalRequestId,
      withPriorityFee,
    } = job.data;

    const withdrawalRequest =
      await this.withdrawalService.getById(withdrawalRequestId);

    if (!withdrawalRequest) {
      throw new NotFoundError(
        'Withdrawal request not found',
        'WithdrawalRequest',
        withdrawalRequestId,
      );
    }

    try {
      let tx: string | undefined;
      switch (blockchain) {
        case Blockchain.Tron: {
          if (currency === WithdrawalRequestCurrency.Usdt) {
            tx = await this.tronTreasuryService.sendToken({
              amount: new Decimal(amount),
              to: withdrawalRequest.targetWallet,
              type: 'USDT',
            });
          }
          if (currency === WithdrawalRequestCurrency.Usdc) {
            tx = await this.tronTreasuryService.sendToken({
              amount: new Decimal(amount),
              to: withdrawalRequest.targetWallet,
              type: 'USDC',
            });
          }
          if (currency === WithdrawalRequestCurrency.Trx) {
            tx = await this.tronTreasuryService.sendTrx({
              to: withdrawalRequest.targetWallet,
              amount,
            });
          }
          break;
        }
        case Blockchain.Solana: {
          if (currency === WithdrawalRequestCurrency.Usdt) {
            tx = await this.solanaWeb3Provider.sendToken(
              new Decimal(amount),
              withdrawalRequest.targetWallet,
              'USDT',
              withPriorityFee,
            );
          }
          if (currency === WithdrawalRequestCurrency.Usdc) {
            tx = await this.solanaWeb3Provider.sendToken(
              new Decimal(amount),
              withdrawalRequest.targetWallet,
              'USDC',
              withPriorityFee,
            );
          }
          if (currency === WithdrawalRequestCurrency.Solana) {
            tx = await this.solanaWeb3Provider.sendLamports(
              new Decimal(amount),
              withdrawalRequest.targetWallet,
              withPriorityFee,
            );
          }
          break;
        }
        case Blockchain.Ethereum: {
          if (currency === WithdrawalRequestCurrency.Usdt) {
            tx = await this.evmWeb3Provider.sendToken(
              amount,
              withdrawalRequest.targetWallet,
              'USDT',
            );
          }
          if (currency === WithdrawalRequestCurrency.Usdc) {
            tx = await this.evmWeb3Provider.sendToken(
              amount,
              withdrawalRequest.targetWallet,
              'USDC',
            );
          }
          if (currency === WithdrawalRequestCurrency.Ethereum) {
            tx = await this.evmWeb3Provider.sendEthereum(
              amount,
              withdrawalRequest.targetWallet,
            );
          }
          break;
        }
        default: {
          throw new Error('Invalid blockchain');
        }
      }

      if (tx === undefined) {
        await this.prismaService.withdrawalRequest.update({
          where: {
            id: withdrawalRequestId,
          },
          data: {
            status: TransactionStatuses.FAILED,
            metadata: {
              ...(withdrawalRequest.metadata as Record<string, any>),
              error: 'Failed to generate transaction',
            },
          },
        });
        await this.balanceService.revertWithdrawal(
          withdrawalRequest,
        );
        return;
      }

      await this.prismaService.$transaction(async (transactionManager) => {
        await this.withdrawalService.setHashForRequest(
          withdrawalRequestId,
          tx!,
          transactionManager,
        );

        const currentBalance = await transactionManager.balance.findUnique({
          where: {
            userId,
          },
          select: {
            totalWithdraw: true,
          },
        });

        if (!currentBalance) {
          this._logger.error(
            {
              message: 'Balance not found',
              userId,
              requestId: withdrawalRequestId,
            },
            'WithdrawRequest.balanceNotFound',
          );
          return;
        }
        const updatedTotalWithdraw = currentBalance.totalWithdraw;
        try {
          await transactionManager.balance.update({
            where: {
              userId,
            },
            data: {
              totalWithdraw: updatedTotalWithdraw.add(
                new Decimal(pointsAmount),
              ),
            },
          });
        } catch (error) {
          this._logger.error(
            {
              error: error.message,
              stack: error.stack,
              userId,
              requestId: withdrawalRequestId,
            },
            'WithdrawRequest.balanceUpdate',
          );
        }
      });

      this._logger.log(
        {
          tx,
        },
        'WithdrawRequest',
      );
    } catch (error) {
      const originalError =
        error instanceof RetryWithPriorityError ? error.originalError : error;

      this._logger.error(
        {
          error: originalError.message,
          stack: originalError.stack,
          withdrawalRequestId,
        },
        'WithdrawRequest',
      );

      this.httpService.axiosRef
        .post(this.configService.getOrThrow<string>(ENV.SLACK_WEBHOOK_URL), {
          text: JSON.stringify({
            message: 'Withdrawal failed',
            withdrawalRequestId,
            amount: getAmountInCurrencyString(amount, currency, blockchain),
            error: originalError.message,
            stack: originalError.stack,
          }),
        })
        .catch((error) => {
          this._logger.error(
            {
              error: error.message,
              stack: error.stack,
            },
            'WithdrawRequest.slack',
          );
        });

      // We retry only 4 times
      // Once without priority fee
      // Once with median priority fee
      // And 2 times with max priority fee
      // AttemptsMade is 0-indexed
      if (error instanceof RetryWithPriorityError && job.attemptsMade < 3) {
        throw error;
      }

      Promise.all([
        this.notificationsService.createNotificationsForRole(
          Roles.RISK_MANAGEMENT,
          NotificationCodes.WITHDRAWAL_REQUEST_FAILED,
          undefined,
          {
            amount: getAmountInCurrencyString(amount, currency, blockchain),
          },
        ),
        this.notificationsService.createNotificationsForRole(
          Roles.RISK_MANAGEMENT_TRAINEE,
          NotificationCodes.WITHDRAWAL_REQUEST_FAILED,
          undefined,
          {
            amount: getAmountInCurrencyString(amount, currency, blockchain),
          },
        ),
      ]);
      await this.balanceService.revertWithdrawal(
        withdrawalRequest,
      );

      await this.prismaService.withdrawalRequest.update({
        where: {
          id: withdrawalRequestId,
        },
        data: {
          status: TransactionStatuses.FAILED,
          metadata: {
            ...(withdrawalRequest.metadata as Record<string, any>),
            error: originalError.message,
            stack: originalError.stack,
          },
        },
      });
      await job.remove();
    }
  }
}
