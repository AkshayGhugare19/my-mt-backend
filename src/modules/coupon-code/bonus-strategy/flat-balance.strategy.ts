import { PrismaTransactionManager } from '@infrastructure/database/prisma/prisma.service';
import {
  BonusProgressStatuses,
  BonusTriggerConfigTypes,
  BonusTriggerTypes,
  BonusTypes,
} from '@modules/bonus/enum';
import { BonusTriggerStrategies } from '@modules/bonus/handlers/strategy';
import { ProducerStrategy } from '@modules/bonus/handlers/strategy/strategy';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import {
  BonusProducerEvent,
  CreateUserBonusProgression,
  CreateUserBonusBalance,
  BonusWithProducerTriggers,
} from '@modules/bonus/types';
import { getExpirationTime } from '@modules/bonus/utils/get-expiration-time';
import { CouponCodeConfig } from '@modules/coupon-code/schema/validator/code-config.validator';
import { Injectable, OnModuleInit } from '@nestjs/common';
import cuid2 from '@paralleldrive/cuid2';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { DateTime } from 'luxon';

@Injectable()
export class CouponCodeFlatBalanceStrategy
implements ProducerStrategy, OnModuleInit {
  constructor(
    private readonly bonusTriggerStrategies: BonusTriggerStrategies,
    private readonly asyncLogService: AsyncLogService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.bonusTriggerStrategies.registerCustomStrategy(
      BonusTriggerConfigTypes.COUPON_CODE_FLAT,
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

    const triggerConfig = bonus.bonusTriggerProducerConfig.find(
      (t) => t.type === BonusTriggerConfigTypes.COUPON_CODE_FLAT,
    );

    if (bonus.type === BonusTypes.INSTANT && !bonus.withdrawAfterRollover) {
      return {
        id: cuid2.createId(),
        bonusId: bonus.id,
        currentProgress: 0,
        rewardAmount: bonus.rewardAmount,
        targetProgress: 0,
        userId: event.userId,
        status: BonusProgressStatuses.COMPLETED,
        configOverride: triggerConfig?.config as CouponCodeConfig | undefined,
        isRefillable: true,
        claimedAt: DateTime.now().toJSDate(),
      };
    }

    if (!triggerConfig) {
      this.asyncLogService.log(
        { bonus },
        'CouponCodeFlatBalanceStrategy.createProgressEntity.noTriggerConfig',
      );
      return null;
    }
    const config = triggerConfig.config as CouponCodeConfig;
    const isInstant = config.rolloverTargetMultiplier <= 0;

    return {
      id: cuid2.createId(),
      userId,
      status: BonusProgressStatuses.PENDING,
      bonusId: bonus.id,
      currentProgress: 0,
      rewardAmount: config.rewardAmount,
      expiresAt: getExpirationTime(config.rolloverExpiryTime, 1),
      targetProgress: isInstant ? 0 : this.getRolloverAmount(config),
      configOverride: triggerConfig?.config as CouponCodeConfig | undefined,
      isRefillable: true,
    };
  }

  private getRolloverAmount(triggerConfig: CouponCodeConfig): number {
    return decimalToNumber(
      new Decimal(triggerConfig.rolloverTargetMultiplier)
        .div(100)
        .mul(triggerConfig.rewardAmount),
    );
  }

  async createBonusBalanceEntity(
    targetEvent: BonusProducerEvent,
  ): Promise<CreateUserBonusBalance | null> {
    const { bonus, event } = targetEvent;
    const { userId } = event;

    const triggerConfig = bonus.bonusTriggerProducerConfig.find(
      (t) => t.type === BonusTriggerConfigTypes.COUPON_CODE_FLAT,
    );
    if (!triggerConfig) {
      this.asyncLogService.log(
        { bonus },
        'CouponCodeFlatBalanceStrategy.createProgressEntity.noTriggerConfig',
      );
      return null;
    }

    const config = triggerConfig.config as CouponCodeConfig;

    return {
      userId,
      bonusId: bonus.id,
      balance: config.rewardAmount,
      expiresAt: bonus.withdrawAfterRollover && config.rolloverExpiryTime
        ? getExpirationTime(config.rolloverExpiryTime, 1)
        : null,
    };
  }
}
