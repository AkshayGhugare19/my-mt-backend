import { PartnerMatrixCron } from '@infrastructure/cron-jobs/producer/partner-matrix.cron';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import Redis from 'ioredis';
import { getRedisToken, DEFAULT_REDIS_NAMESPACE } from '@songkeys/nestjs-redis';
import { vi } from 'vitest';
import { PartnerMatrixApi } from '@external/partner-matrix/api';
import { Test } from '@nestjs/testing';
import { ENV } from '@common/env';

const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T00000000/B00000000/X00000000';
describe('PartnerMatrixCron Integration Test', () => {
  let partnerMatrixCron: PartnerMatrixCron;

  let redis: Redis;
  let httpService: HttpService;
  let partnerMatrixApi: PartnerMatrixApi;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PartnerMatrixCron, {
        provide: PartnerMatrixApi,
        useValue: { createTransactionBulk: vi.fn() },
      },
      {
        provide: PrismaService,
        useValue: vi.fn(),
      },
      {
        provide: HttpService,
        useValue: {
          axiosRef: {
            post: vi.fn(),
          },
        },
      },
      {
        provide: ConfigService,
        useValue: {
          getOrThrow: vi.fn((a: string) => {
            if (a === ENV.SLACK_WEBHOOK_URL) {
              return SLACK_WEBHOOK_URL;
            }

            return 'test';
          })
        },
      },
      {
        provide: getRedisToken(DEFAULT_REDIS_NAMESPACE),
        useValue: { lrange: vi.fn(), ltrim: vi.fn() },
      },
      ],
    })
      .compile();

    partnerMatrixCron = moduleRef.get(PartnerMatrixCron);
    redis = moduleRef.get(getRedisToken(DEFAULT_REDIS_NAMESPACE));
    httpService = moduleRef.get(HttpService);
    partnerMatrixApi = moduleRef.get(PartnerMatrixApi);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Should send slack notification when partner matrix request fails', async () => {
    const transactionResult = [
      JSON.stringify({
        external_id: '1',
        amount: 100,
        currency: 'USD',
        status: 'pending',
      }),
      JSON.stringify({
        external_id: '2',
        amount: 200,
        currency: 'USD',
        status: 'pending',
      }),
    ];
    vi.spyOn(redis, 'lrange').mockImplementation(async () => {
      return transactionResult;
    });

    vi.spyOn(partnerMatrixApi, 'createTransactionBulk').mockImplementationOnce(() =>
      Promise.resolve(undefined),
    );

    vi.spyOn(httpService.axiosRef, 'post').mockImplementationOnce(() =>
      Promise.resolve({}),
    );

    // @ts-expect-error - This is a private method
    await partnerMatrixCron.sentTransactions();

    expect(httpService.axiosRef.post).toHaveBeenCalledWith(
      SLACK_WEBHOOK_URL, {

        text: JSON.stringify({
          message: 'Partner matrix request failed, no response',
          failedTransactions: transactionResult.map((transaction) => {
            return JSON.parse(transaction);
          }),
        }),
      }
    );
  });

  it('Should retry transaction request if 901 or 902 error code is returned', async () => {
    const transactionResult = [
      JSON.stringify({
        amount: 100,
        currency: 'USD',
        status: 'pending',
        transactions: [
          {
            external_id: '1',
            amount: 100,
            currency: 'USD',
          },
        ],
      }),
      JSON.stringify({
        amount: 200,
        currency: 'USD',
        status: 'pending',
        transactions: [
          {
            external_id: '2',
            amount: 200,
            currency: 'USD',
          },
        ],
      }),
    ];
    vi.spyOn(redis, 'lrange').mockImplementation(async () => {
      return transactionResult;
    });

    let callCount = 0;

    const errorResponse901 = {
      error_code: 901,
      error_message: 'test',
      failed: {} as any,
    };

    const errorResponse902 = {
      error_code: 902,
      error_message: 'test',
      failed: {} as any,
    };
    const timestamps: number[] = [];

    vi.spyOn(partnerMatrixApi, 'createTransactionBulk').mockImplementation(() => {
      timestamps.push(Date.now());
      callCount++;
      if (callCount <= 1) {
        return Promise.resolve(errorResponse901);
      }

      if (callCount <= 2) {
        return Promise.resolve(errorResponse902);
      }

      return Promise.resolve(errorResponse901);
    });

    vi.spyOn(httpService.axiosRef, 'post').mockImplementationOnce(() =>
      Promise.resolve({}),
    );

    // @ts-expect-error - This is a private method
    const retrySpy = vi.spyOn(partnerMatrixCron, 'wrapWithRetry');

    // @ts-expect-error - This is a private method
    const insertions = await partnerMatrixCron.sentTransactions();

    expect(partnerMatrixApi.createTransactionBulk).toHaveBeenCalledTimes(3);
    expect(retrySpy).toHaveBeenCalledTimes(3);

    expect(retrySpy).toHaveBeenNthCalledWith(1, expect.any(Function));
    expect(retrySpy).toHaveBeenNthCalledWith(2, expect.any(Function), 2, 200, 'exponential');
    expect(retrySpy).toHaveBeenNthCalledWith(3, expect.any(Function), 1, 400, 'exponential');

    expect(httpService.axiosRef.post).toHaveBeenCalledWith(
      SLACK_WEBHOOK_URL, {

        text: JSON.stringify({
          message: 'Partner matrix retry failed',
          failedTransactions: transactionResult.map((transaction) => {
            return JSON.parse(transaction);
          }),
        }),
      }
    );

    expect(timestamps.length).toBeGreaterThanOrEqual(3);
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(100);
    expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(200);

    expect(insertions.toBeInserted.length).toBe(2);
    expect(insertions.toBeInserted.every(insert => insert.success === false)).toBe(true);
    expect(insertions.toBeInserted.every(insert => (insert.data as any).error_code === errorResponse901.error_code && (insert.data as any).error_message === errorResponse901.error_message)).toBe(true);
  });

  it('Should send transaction when 0 error code is returned', async () => {
    const transactionResult = [
      JSON.stringify({
        amount: 100,
        currency: 'USD',
        status: 'pending',
        transactions: [
          {
            external_id: '1',
            amount: 100,
            currency: 'USD',
          },
        ],
      }),
      JSON.stringify({
        amount: 200,
        currency: 'USD',
        status: 'pending',
        transactions: [
          {
            external_id: '2',
            amount: 200,
            currency: 'USD',
          },
        ],
      }),
    ];
    vi.spyOn(redis, 'lrange').mockImplementation(async () => {
      return transactionResult;
    });

    vi.spyOn(partnerMatrixApi, 'createTransactionBulk').mockImplementation(() => {
      return Promise.resolve({
        error_code: 0,
        error_message: 'test',
        failed: {} as any,
      });
    });

    vi.spyOn(httpService.axiosRef, 'post').mockImplementationOnce(() =>
      Promise.resolve({}),
    );

    // @ts-expect-error - This is a private method
    const retrySpy = vi.spyOn(partnerMatrixCron, 'wrapWithRetry');

    // @ts-expect-error - This is a private method
    const insertions = await partnerMatrixCron.sentTransactions();

    expect(partnerMatrixApi.createTransactionBulk).toHaveBeenCalledTimes(1);
    expect(retrySpy).toHaveBeenCalledTimes(1);

    expect(retrySpy).toHaveBeenNthCalledWith(1, expect.any(Function));

    expect(httpService.axiosRef.post).toHaveBeenCalledTimes(0);

    expect(insertions.toBeInserted.length).toBe(2);
    expect(insertions.toBeInserted.every(insert => insert.success === true)).toBe(true);
    expect(insertions.toBeInserted.every(insert => (insert.data as any).error_code === undefined)).toBe(true);
  });
});
