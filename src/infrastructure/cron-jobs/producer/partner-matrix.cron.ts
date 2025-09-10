import { ENV } from '@common/env';
import { PartnerMatrixApi } from '@external/partner-matrix/api';
import { CreateTransactionBody, RegisterNewPlayerBody } from '@external/partner-matrix/bodies';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import {
  REDIS_KEY__PARTNER_MATRIX_REGISTERS,
  REDIS_KEY__PARTNER_MATRIX_TRANSACTIONS,
} from '@infrastructure/redis/keys';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';

const RETRY_ERROR_CODES = [901, 902];

@Injectable()
export class PartnerMatrixCron {
  private readonly _logger = new Logger(PartnerMatrixCron.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly partnerMatrixApi: PartnerMatrixApi,
    private readonly prismaService: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async pushData(): Promise<void> {
    const { toBeInserted: playerRegistrationEvents } = await this.sendPlayerRegistrationEvents();

    const { toBeInserted: transactionEvents } = await this.sentTransactions();

    await this.prismaService.partnerMatrixEvent.createMany({
      data: [...playerRegistrationEvents, ...transactionEvents],
    });
  }

  @Cron('0 */15 * * * *')
  async retryFailedTransactions(): Promise<void> {
    this._logger.log('Starting retry of failed partner matrix transactions');

    // Fetch up to 500 failed transactions with error code 901 or 902
    const failedEvents = await this.prismaService.partnerMatrixEvent.findMany({
      where: {
        success: false,
        OR: [
          {
            data: {
              path: ['error_code'],
              equals: RETRY_ERROR_CODES[0],
            },
          },
          {
            data: {
              path: ['error_code'],
              equals: RETRY_ERROR_CODES[1],
            },
          },
        ],
      },
      take: 500,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Combine the results

    if (failedEvents.length === 0) {
      this._logger.log('No failed transactions to retry');
      return;
    }

    this._logger.log(
      `Found ${failedEvents.length} failed transactions to retry: ${failedEvents.map((event) => event.id).join(', ')}`,
    );

    const toBeUpdated: Prisma.PartnerMatrixEventUpdateArgs[] = [];

    // Process the transactions - preparing data by removing error fields
    const transactionsToRetry: { id: number; createTransactionBody: CreateTransactionBody; metadata: any }[] =
      failedEvents.map((event) => {
        const eventData = event.data as any;
        // Remove error_code and error_message if they exist
        const { error_code: errorCode, error_message: errorMessage, ...cleanData } = eventData;
        return {
          id: event.id,
          createTransactionBody: cleanData as CreateTransactionBody,
          metadata: event.metadata,
        };
      });

    // Retry the transactions in bulk
    const transactionEventsResult = await this.wrapWithRetry(async () => {
      const result = await this.partnerMatrixApi.createTransactionBulk(
        transactionsToRetry.map((transaction) => transaction.createTransactionBody),
      );
      if (result?.error_code === 901 || result?.error_code === 902) {
        this.httpService.axiosRef
          .post(this.configService.getOrThrow<string>(ENV.SLACK_WEBHOOK_URL), {
            text: JSON.stringify({
              message: 'Partner matrix retry call failed. Need to retry again.',
              failedTransactions: transactionsToRetry.map((transaction) => {
                return {
                  ...transaction,
                };
              }),
              result,
            }),
          })
          .catch((error) => {
            this._logger.error(
              {
                error: error.message,
                stack: error.stack,
              },
              'PartnerMatrixRetry.slack',
            );
          });
      }
      return result;
    });

    if (!transactionEventsResult) {
      return;
    }

    // Process results and prepare data for database update
    transactionsToRetry.forEach((transactionEvent) => {
      const transactionEventError =
        transactionEventsResult?.failed?.[transactionEvent.createTransactionBody.transactions[0].external_id] ||
        ((transactionEventsResult.error_code === 901 || transactionEventsResult.error_code === 902) && {
          error_code: transactionEventsResult.error_code,
          error_message: transactionEventsResult.error_message,
        });

      toBeUpdated.push({
        where: {
          id: transactionEvent.id,
        },
        data: {
          data: {
            ...transactionEvent.createTransactionBody,
            ...transactionEventError,
          },
          metadata: {
            ...(transactionEvent.metadata || {}),
            lastRetry: new Date(),
            attempts: (transactionEvent.metadata?.attempts || 0) + 1,
            errors: [...(transactionEvent.metadata?.errors || []), transactionEventError],
          },
          success: !transactionEventError,
        },
      });
    });

    // Insert the results into the database
    await this.prismaService.$transaction(
      toBeUpdated.map((data) => {
        return this.prismaService.partnerMatrixEvent.update(data);
      }),
    );
  }

  private async sentTransactions(): Promise<{ toBeInserted: Prisma.PartnerMatrixEventCreateInput[] }> {
    const toBeInserted: Prisma.PartnerMatrixEventCreateInput[] = [];
    const size = 500;

    while (true) {
      const rawChunk = await this.redis.lrange(REDIS_KEY__PARTNER_MATRIX_TRANSACTIONS, 0, size - 1);

      const parsedChunk: CreateTransactionBody[] = rawChunk.map((event) => {
        return JSON.parse(event);
      });

      const metadata = {
        autoRetryCount: 0,
        slotegratorAutoRetryErrors: [] as { message: string; timestamp: Date }[],
      };

      const transactionEventsResult = await this.wrapWithRetry(async () => {
        const result = await this.partnerMatrixApi.createTransactionBulk(parsedChunk);
        if (result?.error_code === 901 || result?.error_code === 902) {
          metadata.autoRetryCount++;
          metadata.slotegratorAutoRetryErrors.push({ message: result.error_message, timestamp: new Date() });
          this.httpService.axiosRef
            .post(this.configService.getOrThrow<string>(ENV.SLACK_WEBHOOK_URL), {
              text: JSON.stringify({
                message: 'Partner matrix call failed. Need to retry',
                failedTransactions: parsedChunk.map((transaction) => {
                  return {
                    ...transaction,
                  };
                }),
                providerResponse: result,
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
        }
        return result;
      });

      if (!transactionEventsResult) {
        this._logger.warn({ message: 'Partner matrix request failed, no response', parsedChunk });
        break;
      }

      parsedChunk.forEach((transactionEvent) => {
        const transactionEventError =
          transactionEventsResult?.failed?.[transactionEvent.transactions[0].external_id] ||
          ((transactionEventsResult.error_code === 901 || transactionEventsResult.error_code === 902) && {
            error_code: transactionEventsResult.error_code,
            error_message: transactionEventsResult.error_message,
          });

        toBeInserted.push({
          data: {
            ...transactionEvent,
            ...transactionEventError,
          },
          metadata,
          success: !transactionEventError,
        });
      });

      await this.redis.ltrim(REDIS_KEY__PARTNER_MATRIX_TRANSACTIONS, rawChunk.length, -1);

      if (rawChunk.length < size) {
        break;
      }
    }

    return { toBeInserted };
  }

  private async sendPlayerRegistrationEvents(): Promise<{ toBeInserted: Prisma.PartnerMatrixEventCreateInput[] }> {
    const toBeInserted: Prisma.PartnerMatrixEventCreateInput[] = [];
    const size = 500;

    while (true) {
      const rawChunk = await this.redis.lrange(REDIS_KEY__PARTNER_MATRIX_REGISTERS, 0, size - 1);

      const parsedChunk: RegisterNewPlayerBody[] = rawChunk.map((event) => {
        return JSON.parse(event);
      });

      const registerEventsPromises = parsedChunk.map((event) => {
        return this.wrapWithRetry(() => this.partnerMatrixApi.registerNewPlayer(event));
      });
      const registerEventsResults = await Promise.all(registerEventsPromises);

      for (let i = 0; i < parsedChunk.length; i++) {
        toBeInserted.push({
          data: {
            ...parsedChunk[i],
            ...registerEventsResults[i],
          },
          success: registerEventsResults[i]?.error_code === 0,
        });
      }

      await this.redis.ltrim(REDIS_KEY__PARTNER_MATRIX_REGISTERS, rawChunk.length, -1);

      if (rawChunk.length < size) {
        break;
      }
    }

    return { toBeInserted };
  }

  private async wrapWithRetry<T extends { error_code: number } | undefined>(
    fn: () => Promise<T>,
    retryCount: number = 3,
    retryDelay: number = 100,
    retryDelayType: 'fixed' | 'exponential' = 'exponential',
  ): Promise<T> {
    const response = await fn();

    if (retryCount <= 1) {
      return response;
    }

    if (!response || RETRY_ERROR_CODES.includes(response.error_code)) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return this.wrapWithRetry(
        fn,
        retryCount - 1,
        retryDelayType === 'exponential' ? retryDelay * 2 : retryDelay,
        retryDelayType,
      );
    }
    return response;
  }
}
