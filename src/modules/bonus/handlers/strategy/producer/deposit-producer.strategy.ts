import { ENV } from '@common/env';
import {
  gamanzaBenefits,
  GamanzaRank,
} from '@external/gamanza-engage/service/client';
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import {
  BonusProgressStatuses,
  BonusTypes,
  RolloverTypes,
} from '@modules/bonus/enum';
import { ProducerStrategy } from '@modules/bonus/handlers/strategy/strategy';
import { DepositProducerTriggerConfig } from '@modules/bonus/schema/trigger';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import {
  BonusProducerEvent,
  CreateUserBonusProgression,
  CreateUserBonusBalance,
  BonusWithProducerTriggers,
} from '@modules/bonus/types';
import { getExpirationTime } from '@modules/bonus/utils/get-expiration-time';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { UserDepositEvent } from '@modules/transaction-ledger/event/user-deposit.event';
import { Injectable } from '@nestjs/common';
import { Bonus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';

@Injectable()
export class DepositProducerStrategy implements ProducerStrategy {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly asyncLogService: AsyncLogService,
    private readonly configService: ConfigService,
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
    targetEvent: BonusProducerEvent<UserDepositEvent>,
  ): Promise<CreateUserBonusProgression | null> {
    const { event } = targetEvent;

    if (targetEvent.bonus.type === BonusTypes.INSTANT) {
      return {
        bonusId: targetEvent.bonus.id,
        currentProgress: 0,
        rewardAmount: this.getRewardAmount(
          targetEvent.bonus,
          event.pointsAmount,
        ),
        targetProgress: 0,
        userId: event.userId,
        claimedAt: DateTime.now().toJSDate(),
        status: BonusProgressStatuses.COMPLETED,
      };
    }

    const triggerConfig = targetEvent.bonus.bonusTriggerProducerConfig[0];

    if (!triggerConfig) {
      this.asyncLogService.log(
        { bonus: targetEvent.bonus },
        'DepositProducerStrategy.createProgressEntity.noTriggerConfig',
      );
      return null;
    }

    const { config } = triggerConfig;
    const isEventEligibleForBonus = await this.isEligibleForBonus(
      <DepositProducerTriggerConfig>config,
      event,
    );
    if (!isEventEligibleForBonus) {
      this.asyncLogService.log(
        { isEventEligibleForBonus },
        'DepositProducerStrategy.createProgressEntity.isEventEligibleForBonus',
      );
      return null;
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        id: event.userId,
      },
      select: {
        rank: true,
      },
    });

    if (!user) {
      return null;
    }

    const userRank = user.rank as GamanzaRank;

    const refillBonus = gamanzaBenefits[userRank].refillBonus;
    const isWelcome = targetEvent.bonus.name.toLowerCase().includes('welcome'); // TODO: Refactor this
    const welcomeBonusPercentage = this.configService.getOrThrow(
      ENV.WELCOME_BONUS_PERCENTAGE,
    );
    const bonus = {
      ...targetEvent.bonus,
      rewardAmount: isWelcome
        ? new Decimal(welcomeBonusPercentage)
        : refillBonus,
    };

    return {
      userId: event.userId,
      status: BonusProgressStatuses.PENDING,
      bonusId: bonus.id,
      currentProgress: 0,
      expiresAt: getExpirationTime(bonus.rolloverExpiryTime, 1),
      rewardAmount: this.getRewardAmount(bonus, event.pointsAmount),
      targetProgress: decimalToNumber(
        this.getRolloverAmount(bonus, event.pointsAmount),
      ),
    };
  }

  private async isEligibleForBonus(
    config: DepositProducerTriggerConfig,
    event: UserDepositEvent,
  ): Promise<boolean> {
    const {
      depositCount,
      maxAmount,
      minAmount,
      maxDepositCount,
      minDepositCount,
    } = config;
    if (minAmount && event.pointsAmount.lt(minAmount)) {
      this.asyncLogService.log(
        { minAmount, eventAmount: event.pointsAmount },
        'DepositProducerStrategy.createProgressEntity.isEventEligibleForBonus.minAmount',
      );
      return false;
    }
    if (maxAmount && event.pointsAmount.gt(maxAmount)) {
      this.asyncLogService.log(
        { maxAmount, eventAmount: event.pointsAmount },
        'DepositProducerStrategy.createProgressEntity.isEventEligibleForBonus.maxAmount',
      );
      return false;
    }

    if (depositCount || maxDepositCount || minDepositCount) {
      const isValid = await this.verifyDepositCount({
        transactionId: event.transactionId,
        userId: event.userId,
        desiredDepositCount: depositCount,
        minDepositCount,
        maxDepositCount,
      });
      this.asyncLogService.log(
        { depositCount, eventAmount: event.pointsAmount },
        'DepositProducerStrategy.createProgressEntity.isEventEligibleForBonus.depositCount',
      );
      if (!isValid) {
        return false;
      }
    }
    return true;
  }

  private async verifyDepositCount(params: {
    transactionId: string;
    userId: string;
    desiredDepositCount?: number;
    minDepositCount?: number;
    maxDepositCount?: number;
  }): Promise<boolean> {
    const {
      desiredDepositCount,
      transactionId,
      userId,
      maxDepositCount,
      minDepositCount,
    } = params;
    const transaction = await this.prismaService.transaction.findFirst({
      where: {
        id: transactionId,
      },
    });
    if (!transaction) {
      return false;
    }
    const depositsCount = await this.prismaService.transaction.count({
      where: {
        userId,
        counterParty: TransactionCounterParties.DEPOSIT_SERVICE,
        createdAt: {
          lt: transaction.createdAt,
        },
      },
    });
    this.asyncLogService.log(
      { depositsCount, userId, transactionId },
      'DepositProducerStrategy.createProgressEntity.verifyDepositCount',
    );
    if (minDepositCount && depositsCount < minDepositCount) {
      this.asyncLogService.log(
        { depositsCount, eventAmount: userId, transactionId },
        'DepositProducerStrategy.createProgressEntity.depositCountLessThanMinDeposit',
      );
      return false;
    }
    if (maxDepositCount && depositsCount > maxDepositCount) {
      this.asyncLogService.log(
        { depositsCount, eventAmount: userId, transactionId },
        'DepositProducerStrategy.createProgressEntity.depositCountLessThanMinDeposit',
      );
      return false;
    }
    // eslint-disable-next-line sonarjs/prefer-single-boolean-return
    if (desiredDepositCount && desiredDepositCount !== depositsCount + 1) {
      return false;
    }
    return true;
  }

  async createBonusBalanceEntity(
    targetEvent: BonusProducerEvent<UserDepositEvent>,
  ): Promise<CreateUserBonusBalance | null> {
    const { event } = targetEvent;

    const triggerConfig = targetEvent.bonus.bonusTriggerProducerConfig[0];

    if (!triggerConfig) {
      this.asyncLogService.log(
        { bonus: targetEvent.bonus },
        'DepositProducerStrategy.createBonusBalanceEntity.noTriggerConfig',
      );
      return null;
    }

    const { config } = triggerConfig;
    const isEventEligibleForBonus = await this.isEligibleForBonus(
      <DepositProducerTriggerConfig>config,
      event,
    );
    if (!isEventEligibleForBonus) {
      this.asyncLogService.log(
        { isEventEligibleForBonus },
        'DepositProducerStrategy.createBonusBalanceEntity.isEventEligibleForBonus',
      );
      return null;
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        id: event.userId,
      },
      select: {
        rank: true,
      },
    });

    if (!user) {
      return null;
    }

    const userRank = user.rank as GamanzaRank;

    const refillBonus = gamanzaBenefits[userRank].refillBonus;

    const bonus = { ...targetEvent.bonus, rewardAmount: refillBonus };

    return {
      userId: event.userId,
      bonusId: bonus.id,
      balance: this.getRewardAmount(bonus, event.pointsAmount),
      expiresAt: getExpirationTime(
        bonus.bonusExpiryTime,
        bonus.bonusExpiryHour,
      ),
    };
  }

  private getRewardAmount(bonus: Bonus, amount: Decimal): Decimal {
    const computedRewardAmount =
      bonus.rolloverType === RolloverTypes.FIXED
        ? bonus.rewardAmount!
        : bonus.rewardAmount!.mul(amount).div(100);
    this.asyncLogService.log(
      { bonus, rewardAmount: computedRewardAmount },
      'DepositProducerStrategy.getRewardAmount',
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
      : bonus.rolloverAmount!.mul(amount).div(100);
  }
}
