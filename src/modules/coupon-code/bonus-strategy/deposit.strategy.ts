import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import {
  BonusProgressStatuses,
  BonusRewardTypes,
  BonusTriggerConfigTypes,
  BonusTriggerTypes,
  BonusTypes,
  RolloverTypes,
} from '@modules/bonus/enum';
import { BonusTriggerStrategies } from '@modules/bonus/handlers/strategy';
import { ProducerStrategy } from '@modules/bonus/handlers/strategy/strategy';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import {
  BonusProducerEvent,
  CreateUserBonusBalance,
  BonusWithProducerTriggers,
  CreateUserBonusProgressionWithCallbacks,
} from '@modules/bonus/types';
import { getExpirationTime } from '@modules/bonus/utils/get-expiration-time';
import { CouponCodeConfig } from '@modules/coupon-code/schema/validator/code-config.validator';
import { UserDepositEvent } from '@modules/transaction-ledger/event/user-deposit.event';
import { Injectable, OnModuleInit } from '@nestjs/common';
import cuid2 from '@paralleldrive/cuid2';
import { Bonus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { DateTime } from 'luxon';

@Injectable()
export class CouponCodeDepositStrategy
implements ProducerStrategy, OnModuleInit {
  constructor(
    private readonly bonusTriggerStrategies: BonusTriggerStrategies,
    private readonly prismaService: PrismaService,
    private readonly asyncLogService: AsyncLogService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.bonusTriggerStrategies.registerCustomStrategy(
      BonusTriggerConfigTypes.COUPON_CODE,
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
    const { bonus, event } = targetEvent;
    const { userId } = event;
    const userCouponRedeems =
      await this.prismaService.couponCodeRedeem.findFirst({
        where: {
          redeemerId: userId,
          couponCode: {
            bonusId: bonus.id,
            disabledAt: null,
          },
          consumed: false,
        },
        select: {
          id: true,
          couponCode: {
            select: {
              id: true,
              config: true,
            },
          },
        },
      });
    if (!userCouponRedeems) {
      this.asyncLogService.log(
        { bonus, event },
        'overrideBonusConfig.noUserCouponRedeems',
      );
      return null;
    }

    const trigger = bonus.bonusTriggerProducerConfig.find(
      (t) => t.type === BonusTriggerConfigTypes.COUPON_CODE_NEXT_DEPOSIT,
    );

    if (!trigger) {
      this.asyncLogService.log(
        { bonus, event },
        'overrideBonusConfig.noTrigger',
      );
      return null;
    }
    const config = userCouponRedeems.couponCode.config as CouponCodeConfig;

    bonus.bonusExpiryTime = config.bonusExpiryTime ?? null;
    bonus.rolloverExpiryTime = config.rolloverExpiryTime ?? null;
    bonus.rewardAmount = new Decimal(config.rewardAmount);
    bonus.rolloverAmount = config.rolloverTargetMultiplier
      ? new Decimal(config.rolloverTargetMultiplier)
      : null;
    bonus.maxReward = config.maxRewardAmount
      ? new Decimal(config.maxRewardAmount)
      : null;
    bonus.rewardType = config.rewardType;
    bonus.type = config.bonusType;
    bonus.withdrawAfterRollover = config.withdrawAfterRollover;
    // Override the trigger config. Hackish but works.
    trigger.config = config;

    // Replace the trigger with the updated config
    bonus.bonusTriggerProducerConfig = [trigger];
    return {
      bonus,
      callbacks: [
        async (transactionManager): Promise<void> => {
          await transactionManager.couponCodeRedeem.update({
            where: { id: userCouponRedeems.id },
            data: { consumed: true },
          });
        },
      ],
    };
  }

  async createProgressEntity(
    targetEvent: BonusProducerEvent<UserDepositEvent>,
  ): Promise<CreateUserBonusProgressionWithCallbacks | null> {
    const { bonus, event } = targetEvent;
    const { userId, pointsAmount } = event;

    const triggerConfig = bonus.bonusTriggerProducerConfig.find(
      (t) => t.type === BonusTriggerConfigTypes.COUPON_CODE,
    );

    if (!triggerConfig) {
      this.asyncLogService.log(
        { bonus },
        'CouponCodeDepositStrategy.createProgressEntity.noTriggerConfig',
      );
      return null;
    }
    const id = cuid2.createId();

    const rewardAmount = this.getRewardAmount(bonus, pointsAmount);

    if (bonus.type === BonusTypes.INSTANT && !bonus.withdrawAfterRollover) {
      return {
        createUserBonusProgression: {
          id,
          bonusId: bonus.id,
          currentProgress: 0,
          rewardAmount,
          targetProgress: 0,
          userId: event.userId,
          status: BonusProgressStatuses.COMPLETED,
          configOverride: triggerConfig?.config as CouponCodeConfig | undefined,
          claimedAt: DateTime.now().toJSDate(),
        },
        callbacks: [
          async (transactionManager): Promise<void> => {
            await transactionManager.couponCodeRedeem.update({
              where: {
                id: (triggerConfig.config as { redeemId: number }).redeemId,
              },
              data: { consumed: true, bonusProgressId: id },
            });
          },
        ],
      };
    }
    const config = triggerConfig.config as CouponCodeConfig;
    const isEventEligibleForBonus = await this.isEligibleForBonus(
      config,
      event,
    );

    if (!isEventEligibleForBonus) {
      this.asyncLogService.log(
        { isEventEligibleForBonus },
        'CouponCodeDepositStrategy.createProgressEntity.isEventEligibleForBonus',
      );
      return null;
    }

    return {
      createUserBonusProgression: {
        id,
        userId,
        status: BonusProgressStatuses.PENDING,
        bonusId: bonus.id,
        currentProgress: 0,
        expiresAt: getExpirationTime(config.rolloverExpiryTime, 1),
        rewardAmount,
        targetProgress: decimalToNumber(
          this.getRolloverAmount(bonus, rewardAmount),
        ),
        configOverride: triggerConfig?.config as CouponCodeConfig | undefined,
      },
      callbacks: [
        async (transactionManager): Promise<void> => {
          await transactionManager.couponCodeRedeem.update({
            where: {
              id: (triggerConfig.config as { redeemId: number }).redeemId,
            },
            data: { consumed: true, bonusProgressId: id },
          });
        },
      ],
    };
  }

  private getRolloverAmount(bonus: Bonus, amount: Decimal): Decimal {
    return bonus.rolloverType === RolloverTypes.FIXED
      ? bonus.rolloverAmount!
      : bonus.rolloverAmount!.mul(amount).div(100);
  }

  async createBonusBalanceEntity(
    targetEvent: BonusProducerEvent<UserDepositEvent>,
  ): Promise<CreateUserBonusBalance | null> {
    const { bonus, event } = targetEvent;
    const { userId } = event;
    const triggerConfig = bonus.bonusTriggerProducerConfig.find(
      (t) => t.type === BonusTriggerConfigTypes.COUPON_CODE,
    );

    if (!triggerConfig) {
      this.asyncLogService.log(
        { bonus },
        'CouponCodeDepositStrategy.createBonusBalanceEntity.noTriggerConfig',
      );
      return null;
    }
    const config = triggerConfig.config as CouponCodeConfig;
    const isEventEligibleForBonus = await this.isEligibleForBonus(
      config,
      event,
    );
    if (!isEventEligibleForBonus) {
      this.asyncLogService.log(
        { isEventEligibleForBonus },
        'CouponCodeDepositStrategy.createBonusBalanceEntity.isEventEligibleForBonus',
      );
      return null;
    }
    return {
      userId,
      bonusId: bonus.id,
      balance: this.getRewardAmount(bonus, event.pointsAmount),
      expiresAt: getExpirationTime(config.bonusExpiryTime, 1),
    };
  }

  private getRewardAmount(bonus: Bonus, amount: Decimal): Decimal {
    const computedRewardAmount =
      bonus.rewardType === BonusRewardTypes.FLAT
        ? new Decimal(bonus.rewardAmount!)
        : new Decimal(bonus.rewardAmount!).mul(amount).div(100);
    this.asyncLogService.log(
      { bonus, rewardAmount: computedRewardAmount },
      'CouponCodeDepositStrategy.getRewardAmount',
    );
    return bonus.maxReward &&
      bonus.maxReward.gt(0) &&
      computedRewardAmount.gt(bonus.maxReward)
      ? bonus.maxReward
      : computedRewardAmount;
  }

  private async isEligibleForBonus(
    config: CouponCodeConfig,
    event: UserDepositEvent,
  ): Promise<boolean> {
    const { minDepositAmount } = config;
    if (
      minDepositAmount &&
      new Decimal(event.pointsAmount).lt(new Decimal(minDepositAmount))
    ) {
      this.asyncLogService.log(
        { minDepositAmount, eventAmount: event.pointsAmount },
        'DepositProducerStrategy.createProgressEntity.isEventEligibleForBonus.minAmount',
      );
      return false;
    }

    return true;
  }
}
