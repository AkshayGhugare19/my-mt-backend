import { PrismaTransactionManager } from '@infrastructure/database/prisma/prisma.service';
import {
  BonusProgressStatuses,
  BonusTriggerConfigTypes,
  BonusTriggerTypes,
  BonusTypes,
} from '@modules/bonus/enum';
import { BonusTriggerStrategies } from '@modules/bonus/handlers/strategy';
import { ProducerStrategy } from '@modules/bonus/handlers/strategy/strategy';
import {
  BonusProducerEvent,
  CreateUserBonusProgression,
  CreateUserBonusBalance,
  BonusWithProducerTriggers,
} from '@modules/bonus/types';
import { getExpirationTime } from '@modules/bonus/utils/get-expiration-time';
import { Injectable, OnModuleInit } from '@nestjs/common';
import cuid2 from '@paralleldrive/cuid2';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { DateTime } from 'luxon';

@Injectable()
export class TipStrategy implements ProducerStrategy, OnModuleInit {
  constructor(
    private readonly bonusTriggerStrategies: BonusTriggerStrategies,
  ) {}

  async onModuleInit(): Promise<void> {
    this.bonusTriggerStrategies.registerCustomStrategy(
      BonusTriggerConfigTypes.TIP,
      BonusTriggerTypes.PRODUCER,
      this,
    );
  }

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
    targetEvent: BonusProducerEvent,
  ): Promise<CreateUserBonusProgression | null> {
    const { bonus, event } = targetEvent;
    const { userId } = event;

    if (bonus.type === BonusTypes.INSTANT && !bonus.withdrawAfterRollover) {
      return {
        id: cuid2.createId(),
        bonusId: bonus.id,
        currentProgress: 0,
        rewardAmount: event.amount,
        targetProgress: 0,
        userId: event.userId,
        status: BonusProgressStatuses.COMPLETED,
        configOverride: undefined,
        isRefillable: true,
        claimedAt: DateTime.now().toJSDate(),
      };
    }

    return {
      id: cuid2.createId(),
      userId,
      status: BonusProgressStatuses.PENDING,
      bonusId: bonus.id,
      currentProgress: 0,
      rewardAmount: event.amount,
      expiresAt: getExpirationTime(bonus.rolloverExpiryTime, 1),
      targetProgress: this.getRolloverAmount(
        bonus.rolloverAmount,
        event.amount,
      ),
      configOverride: undefined,
      isRefillable: true,
    };
  }

  private getRolloverAmount(
    rolloverMultiplier: Decimal | null,
    rewardAmount: Decimal,
  ): number {
    return decimalToNumber(
      new Decimal(rolloverMultiplier || 1).div(100).mul(rewardAmount),
    );
  }

  async createBonusBalanceEntity(
    targetEvent: BonusProducerEvent,
  ): Promise<CreateUserBonusBalance | null> {
    const { bonus, event } = targetEvent;
    const { userId } = event;

    return {
      userId,
      bonusId: bonus.id,
      balance: event.amount,
      expiresAt: getExpirationTime(bonus.bonusExpiryTime, 1),
    };
  }
}
