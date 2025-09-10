import { PrismaTransactionManager } from '@infrastructure/database/prisma/prisma.service';
import {
  BonusProgressStatuses,
  BonusTypes,
  RolloverTypes,
} from '@modules/bonus/enum';
import { ProducerStrategy } from '@modules/bonus/handlers/strategy/strategy';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import {
  AdminEventData,
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
export class AdminManualProducerStrategy implements ProducerStrategy {
  constructor(private readonly asyncLogService: AsyncLogService) {}

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
    targetEvent: BonusProducerEvent<AdminEventData>,
  ): Promise<CreateUserBonusProgression | null> {
    const { bonus, event } = targetEvent;
    const { amount, bonusId, userId } = event;
    if (bonusId !== bonus.id) {
      this.asyncLogService.log(
        { bonusId, bonusIdFromEvent: bonus.id },
        'AdminManualProducerStrategy.createProgressEntity.bonusIdMismatch',
      );
      return null;
    }
    if (bonus.type === BonusTypes.INSTANT) {
      return {
        bonusId: bonus.id,
        currentProgress: 0,
        rewardAmount: this.getRewardAmount(bonus, amount),
        targetProgress: 0,
        userId: event.userId,
        claimedAt: DateTime.now().toJSDate(),
        status: BonusProgressStatuses.COMPLETED,
      };
    }

    return {
      userId,
      status: BonusProgressStatuses.PENDING,
      bonusId: bonus.id,
      currentProgress: 0,
      rewardAmount: this.getRewardAmount(bonus, amount),
      expiresAt: bonus.rolloverExpiryTime
        ? new Date(Date.now() + bonus.rolloverExpiryTime)
        : null,
      targetProgress: decimalToNumber(
        this.getRolloverAmount(bonus, new Decimal(amount)),
      ),
    };
  }

  async createBonusBalanceEntity(
    targetEvent: BonusProducerEvent<AdminEventData>,
  ): Promise<CreateUserBonusBalance | null> {
    const { bonus, event } = targetEvent;
    const { bonusId, userId, amount } = event;

    if (bonusId !== bonus.id) {
      this.asyncLogService.log(
        { bonusId, bonusIdFromEvent: bonus.id },
        'AdminManualProducerStrategy.createProgressEntity.bonusIdMismatch',
      );
      return null;
    }

    return {
      userId,
      bonusId: bonus.id,
      balance: this.getRewardAmount(bonus, amount),
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

  private getRewardAmount(bonus: Bonus, amount: number): Decimal {
    const computedRewardAmount =
      bonus.rolloverType === RolloverTypes.FIXED
        ? bonus.rewardAmount!
        : bonus.rewardAmount!.mul(amount);
    this.asyncLogService.log(
      { bonus, rewardAmount: computedRewardAmount },
      'AdminManualProducerStrategy.getRewardAmount',
    );
    return bonus.maxReward &&
      bonus.maxReward.gt(0) &&
      computedRewardAmount.gt(bonus.maxReward)
      ? bonus.maxReward
      : computedRewardAmount;
  }

  private getRolloverAmount(bonus: Bonus, amount: Decimal): Decimal {
    return bonus.rolloverType === RolloverTypes.FIXED
      ? bonus.rolloverAmount!
      : bonus.rolloverAmount!.mul(amount);
  }
}
