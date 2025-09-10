import { Roles } from '@modules/role/enum/role.enum';
import { ENV } from '@common/env';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { StatisticsTarget } from '@modules/statistics/enum/statistics-target.enum';
import { FundsCountAndValue } from '@modules/statistics/types';
import { convertStatisticsTargetToRole } from '@modules/statistics/utils/convert-statistics-target-to-role';
import { TokenRequestStatuses } from '@modules/token-issue/enum/token-request-status.enum';
import { WITHDRAWAL_STATUSES } from '@modules/withdrawal/enum/withdrawal-status.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import { DateTime } from 'luxon';
import { formatStatisticsCacheKey } from '@modules/statistics/utils/format-statistics-cache-key';
import Redis from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { ONE_HOUR_IN_SECONDS } from '@common/constants';
@Injectable()
export class FundsStatisticsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async getTotalFunds({
    target = 'all',
    masterId,
    cache = false,
    endDate,
    startDate
  }: {
    masterId?: string;
    target: StatisticsTarget;
    startDate?: DateTime;
    endDate?: DateTime;
    cache?: boolean;
  }): Promise<Decimal> {
    if (cache) {
      const cacheKey = formatStatisticsCacheKey(target, 'total', masterId, startDate, endDate);
      const cachedValue = await this.redis.get(cacheKey);
      if (cachedValue) return new Decimal(cachedValue);
    }
    const funds = await this.prismaService.balance.aggregate({
      _sum: {
        balance: true,
      },
      where: {
        user: {
          masterId,
          userRoles: {
            some: {
              role: {
                name: {
                  in: convertStatisticsTargetToRole(target),
                },
              },
            },
          },
        },
      },
    });

    if (cache && funds._sum.balance) {
      const cacheKey = formatStatisticsCacheKey(target, 'total', masterId, startDate, endDate);
      await this.redis.set(cacheKey, funds._sum.balance.toString(), 'EX', 3 * ONE_HOUR_IN_SECONDS);
    }

    return funds._sum.balance || new Decimal(0);
  }

  async getDepositsStatistics(
    startDate?: DateTime,
    endDate?: DateTime,
    cache?: boolean,
  ): Promise<FundsCountAndValue> {
    if (cache) {
      const cacheKey = formatStatisticsCacheKey('all', 'deposits', undefined, startDate, endDate);
      const cachedValue = await this.redis.get(cacheKey);
      if (cachedValue) {
        const parsedValue = JSON.parse(cachedValue);
        return {
          count: +parsedValue.count,
          value: new Decimal(parsedValue.value),
        };
      }
    }

    const data = await this.prismaService.depositTransaction.findMany({
      where: {
        status: 'success',
        blockTimestamp: startDate || endDate
          ? {
              gte: startDate?.toJSDate().getTime(),
              lte: endDate?.toJSDate().getTime(),
            }
          : undefined,
      },
    });

    const sum = data.reduce(
      (sum, item) => sum.plus(item.usdAmount ?? item.amount ?? new Decimal(0)),
      new Decimal(0),
    );

    if (cache) {
      const cacheKey = formatStatisticsCacheKey('all', 'deposits', undefined, startDate, endDate);
      await this.redis.set(cacheKey, JSON.stringify({ count: data.length, value: sum.mul(this.configService.getOrThrow(ENV.USD_POINTS)).toString() }), 'EX', 3 * ONE_HOUR_IN_SECONDS);
    }

    return {
      count: data.length,
      value: sum.mul(this.configService.getOrThrow(ENV.USD_POINTS)),
    };
  }

  async getWithdrawalStatistics(startDate?: DateTime, endDate?: DateTime, cache?: boolean): Promise<FundsCountAndValue> {
    if (cache) {
      const cacheKey = formatStatisticsCacheKey('all', 'withdrawals', undefined, startDate, endDate);
      const cachedValue = await this.redis.get(cacheKey);
      if (cachedValue) {
        const parsedValue = JSON.parse(cachedValue);
        return {
          count: +parsedValue.count,
          value: new Decimal(parsedValue.value),
        };
      }
    }

    const data = await this.prismaService.withdrawalRequest.findMany({
      where: {
        status: {
          in: [
            WITHDRAWAL_STATUSES.AUTO_ACCEPTED,
            WITHDRAWAL_STATUSES.FULFILLED,
          ],
        },
        createdAt: startDate || endDate
          ? {
              gte: startDate?.toJSDate(),
              lte: endDate?.toJSDate(),
            }
          : undefined,
      },
    });

    const sum = data.reduce(
      (sum, item) => sum.plus(item.usdAmount ?? item.amount ?? new Decimal(0)),
      new Decimal(0),
    );

    if (cache) {
      const cacheKey = formatStatisticsCacheKey('all', 'withdrawals', undefined, startDate, endDate);
      await this.redis.set(cacheKey, JSON.stringify({ count: data.length, value: sum.mul(this.configService.getOrThrow(ENV.USD_POINTS)).toString() }), 'EX', 3 * ONE_HOUR_IN_SECONDS);
    }

    return {
      count: data.length,
      value: sum.mul(this.configService.getOrThrow(ENV.USD_POINTS)),
    };
  }

  async getVolumeStatistics(
    target: StatisticsTarget = 'all',
    masterId?: string,
    startDate?: DateTime,
    endDate?: DateTime,
    cache?: boolean,
  ): Promise<Decimal> {
    if (cache) {
      const cacheKey = formatStatisticsCacheKey(target, 'volume', masterId, startDate, endDate);
      const cachedValue = await this.redis.get(cacheKey);
      if (cachedValue) return new Decimal(cachedValue);
    }

    const data = await this.prismaService.bet.aggregate({
      where: {
        createdAt: startDate || endDate
          ? {
              gte: startDate?.toJSDate(),
              lte: endDate?.toJSDate(),
            }
          : undefined,
        user: {
          userRoles: {
            some: {
              role: {
                name: {
                  in: convertStatisticsTargetToRole(target),
                },
              },
            },
          },
          masterId: masterId ? { equals: masterId } : undefined,
        },
      },
      _sum: {
        betAmount: true,
      },
    });

    if (cache && data?._sum?.betAmount) {
      const cacheKey = formatStatisticsCacheKey(target, 'volume', masterId, startDate, endDate);
      await this.redis.set(cacheKey, data?._sum?.betAmount.toString(), 'EX', 3 * ONE_HOUR_IN_SECONDS);
    }

    return data?._sum?.betAmount || new Decimal(0);
  }

  async getTokenIssueStatistics(
    masterId?: string,
    startDate?: DateTime,
    endDate?: DateTime,
    cache?: boolean,
  ): Promise<Decimal> {
    if (cache) {
      const cacheKey = formatStatisticsCacheKey('vip', 'tokenIssue', masterId, startDate, endDate);
      const cachedValue = await this.redis.get(cacheKey);
      if (cachedValue) return new Decimal(cachedValue);
    }

    const data = await this.prismaService.tokenIssueRequest.aggregate({
      where: {
        createdAt: startDate || endDate
          ? {
              gte: startDate?.toJSDate(),
              lte: endDate?.toJSDate(),
            }
          : undefined,
        masterId,
        requester: {
          userRoles: {
            some: {
              role: {
                name: Roles.VIP_USER,
              },
            },
          },
        },
        status: TokenRequestStatuses.APPROVED,
      },
      _sum: {
        amount: true,
      },
    });

    if (cache && data?._sum?.amount) {
      const cacheKey = formatStatisticsCacheKey('vip', 'tokenIssue', masterId, startDate, endDate);
      await this.redis.set(cacheKey, data?._sum?.amount.toString(), 'EX', 3 * ONE_HOUR_IN_SECONDS);
    }

    return data?._sum?.amount || new Decimal(0);
  }
}
