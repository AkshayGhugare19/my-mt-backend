import { ONE_DAY_IN_MS } from '@common/constants';
import {
  gamanzaBenefits,
  GamanzaRank,
} from '@external/gamanza-engage/service/client';
import { PrismaService, PrismaTransactionManager } from '@infrastructure/database/prisma/prisma.service';
import { BonusProgressStatuses, RolloverTypes } from '@modules/bonus/enum';
import { ProducerStrategy } from '@modules/bonus/handlers/strategy/strategy';
import { BonusTriggerConfig } from '@modules/bonus/schema/trigger';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import {
  BonusProducerEvent,
  BonusWithProducerTriggers,
  CreateUserBonusBalance,
  CreateUserBonusProgression,
} from '@modules/bonus/types';
import { Injectable } from '@nestjs/common';
import { Bonus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { DateTime } from 'luxon';

@Injectable()
export class CashbackProducerStrategy implements ProducerStrategy {
  constructor(
    private readonly asyncLogService: AsyncLogService,
    private readonly prismaService: PrismaService,
  ) {}

  async getProducerContext(targetEvent: BonusProducerEvent): Promise<{
    bonus: BonusWithProducerTriggers;
    callbacks: ((
      transactionManager: PrismaTransactionManager,
    ) => Promise<void>)[];
  } | null> {
    return {
      bonus: targetEvent.bonus,
      callbacks: [],
    };
  }

  async createProgressEntity(
    targetEvent: BonusProducerEvent<{ userId: string }>,
  ): Promise<CreateUserBonusProgression | null> {
    const { event, bonus: initialBonus } = targetEvent;
    this.asyncLogService.log(
      { targetEvent },
      'CashbackProducerStrategy.bonusNotFound',
    );

    const triggerConfig = initialBonus.bonusTriggerProducerConfig[0];

    if (!triggerConfig) {
      this.asyncLogService.log(
        { initialBonus },
        'CashbackProducerStrategy.noTriggerConfig',
      );
      return null;
    }

    const { userId } = event;
    const config = triggerConfig.config as BonusTriggerConfig;

    const totalLoss = await this.getTotalLoss(userId, config);

    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        rank: true,
      },
    });

    if (!totalLoss || !user) {
      return null;
    }

    const userRank = user.rank as GamanzaRank;

    const cashbackBonus = gamanzaBenefits[userRank].cashbackBonus;

    const bonus = { ...targetEvent.bonus, rewardAmount: cashbackBonus };

    return {
      userId,
      status: BonusProgressStatuses.PENDING,
      bonusId: bonus.id,
      currentProgress: 0,
      rewardAmount: this.getRewardAmount(bonus, totalLoss),
      expiresAt: bonus.rolloverExpiryTime
        ? new Date(Date.now() + bonus.rolloverExpiryTime)
        : null,
      targetProgress: decimalToNumber(this.getRolloverAmount(bonus, totalLoss)),
    };
  }

  async createBonusBalanceEntity(
    targetEvent: BonusProducerEvent<{ userId: string; delta: Decimal }>,
  ): Promise<CreateUserBonusBalance | null> {
    const { event } = targetEvent;
    this.asyncLogService.log(
      { targetEvent },
      'CashbackProducerStrategy.bonusNotFound',
    );

    const { userId } = event;

    const totalLoss =
      /* await this.getTotalLoss(event.userId, config) */ targetEvent.event
        .delta;

    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        rank: true,
      },
    });

    if (!totalLoss || !user) {
      return null;
    }

    const userRank = user.rank as GamanzaRank;

    const cashbackBonus = gamanzaBenefits[userRank].cashbackBonus;

    const bonus = { ...targetEvent.bonus, rewardAmount: cashbackBonus };

    return {
      userId,
      bonusId: bonus.id,
      balance: this.getRewardAmount(bonus, totalLoss),
      expiresAt: bonus.bonusExpiryTime
        ? this.getExpirationTime(bonus.bonusExpiryTime, bonus.bonusExpiryHour)
        : null,
    };
  }

  private getExpirationTime(
    expiryTime: number,
    expiryHour: number | null,
  ): Date {
    const date = DateTime.now().plus({ millisecond: expiryTime });
    if (expiryHour) {
      date.set({ hour: expiryHour });
    }
    return date.toJSDate();
  }

  private async getTotalLoss(
    userId: string,
    config: BonusTriggerConfig,
  ): Promise<Decimal | null> {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    const lastDay = new Date(
      now.getTime() - config.lossRewardDayRange! * ONE_DAY_IN_MS,
    );

    this.asyncLogService.log(
      { now, lastDay },
      'CashbackProducerStrategy.lastRewardDay',
    );
    const totalLoss = await this.prismaService.bet.aggregate({
      where: {
        userId,
        settlementAmount: {
          not: null,
          lt: new Decimal(0),
        },
        createdAt: {
          gte: lastDay,
        },
      },
      _sum: {
        settlementAmount: true,
      },
    });

    this.asyncLogService.log(
      { totalLoss, totalLossAbs: totalLoss._sum?.settlementAmount?.abs() },
      'CashbackProducerStrategy.totalLoss',
    );

    if (!totalLoss || !totalLoss._sum?.settlementAmount?.abs()) {
      return null;
    }
    return totalLoss._sum.settlementAmount.abs();
  }

  private getRewardAmount(bonus: Bonus, amount: Decimal): Decimal {
    const computedRewardAmount =
      bonus.rolloverType === RolloverTypes.FIXED
        ? bonus.rewardAmount!.abs()
        : bonus.rewardAmount!.mul(amount).abs().div(100);
    this.asyncLogService.log(
      { bonus, rewardAmount: computedRewardAmount },
      'CashbackProducerStrategy.getRewardAmount',
    );
    return bonus.maxReward &&
      bonus.maxReward.gt(0) &&
      computedRewardAmount.gt(bonus.maxReward)
      ? bonus.maxReward
      : computedRewardAmount;
  }

  private getRolloverAmount(bonus: Bonus, amount: Decimal): Decimal {
    return bonus.rolloverType === RolloverTypes.FIXED
      ? bonus.rolloverAmount!.abs()
      : bonus.rolloverAmount!.mul(amount).abs().div(100);
  }
}
