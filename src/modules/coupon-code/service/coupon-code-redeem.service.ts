import { ONE_MINUTE_IN_MS } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { UserActivationEvent } from '@infrastructure/event/classes';
import { EventNamespace } from '@infrastructure/event/namespace';
import { AtomicLock } from '@infrastructure/lock/utils/atomic-lock';
import {
  BonusTriggerConfigTypes,
  BonusTriggerTypes,
  RolloverTypes,
} from '@modules/bonus/enum';
import { ProducerEventHandler } from '@modules/bonus/handlers/producer-event-handler';
import { BonusTriggerStrategies } from '@modules/bonus/handlers/strategy';
import { CouponCodeTypes } from '@modules/coupon-code/enum/coupon-code-type.enum';
import { CouponCodeAlreadyRedeemedError } from '@modules/coupon-code/error/already-redeemed.error';
import { CouponCodeNotFoundError } from '@modules/coupon-code/error/code-not-found.error';
import { CouponCodeDisabledError } from '@modules/coupon-code/error/disabled.error';
import { CouponCodeExpiredError } from '@modules/coupon-code/error/expired.error';
import { CouponCodeOutOfStockError } from '@modules/coupon-code/error/out-of-stock.error';
import { CouponCodeConfig } from '@modules/coupon-code/schema/validator/code-config.validator';
import { UserCouponCodeRedeems } from '@modules/coupon-code/types';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CouponCode,
  CouponCodeRedeem,
  UserBonusBalance,
  UserBonusProgression,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { DateTime } from 'luxon';
import { CouponCodeGroupAlreadyRedeemedError } from '../error/already-redeemed-group.error';

@Injectable()
export class CouponCodeRedeemService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly bonusProgressHandler: ProducerEventHandler,
    private readonly bonusTriggerStrategies: BonusTriggerStrategies,
    private readonly atomicLock: AtomicLock,
  ) {}

  @OnEvent(EventNamespace.USER_ACTIVATION_ACCOUNT)
  async handleRedeemCouponCode(event: UserActivationEvent): Promise<void> {
    if (event.promoCode) {
      return await this.lockAndRedeemCouponCode(event.userId, event.promoCode);
    }
  }

  async lockAndRedeemCouponCode(userId: string, code: string): Promise<void> {
    return this.atomicLock.withLockGuard(
      async () => {
        await this.redeemCouponCode(userId, code);
      },
      {
        lockKey: [`couponCode:redeem:${userId}`],
        lockDuration: ONE_MINUTE_IN_MS,
        conflictErrorMessage: ErrorMessages.COUPON_CODE_ALREADY_REDEEMED,
        releaseOnComplete: true,
        releaseOnFail: true,
        context: 'redeemCouponCode',
      },
    );
  }

  async redeemCouponCode(
    userId: string,
    code: string,
  ): Promise<UserCouponCodeRedeems> {
    let foundCouponCodeAndRedeems = await this.prismaService.couponCode.findUnique({
      include: {
        couponCodeRedeems: {
          where: {
            redeemerId: userId,
          },
        },
        groups: {
          select: {
            groupId: true,
          },
        },
      },
      where: {
        code,
      },
    });

    if (foundCouponCodeAndRedeems?.groups?.length) {
      const redeemedGroupCodes = await this.prismaService.couponCodeRedeem.findFirst({
        where: {
          redeemerId: userId,
          couponCode: {
            groups: {
              some: {
                groupId: {
                  in: foundCouponCodeAndRedeems.groups.map((g) => g.groupId),
                },
              },
            },
          },
        },
        include: {
          couponCode: true,
        },
      });

      if (redeemedGroupCodes) {
        throw new CouponCodeGroupAlreadyRedeemedError();
      }
    }

    foundCouponCodeAndRedeems = this.verifyCodeClaimConditions(
      foundCouponCodeAndRedeems,
    );

    const redeemedCode = await this.prismaService.$transaction(
      async (transactionManager) => {
        const updateResult = await transactionManager.couponCode.updateMany({
          where: {
            code,
            stock: {
              gt: 0,
            },
            OR: [
              {
                expiresAt: {
                  gt: DateTime.now().toISO(),
                },
              },
              {
                expiresAt: null,
              },
            ],
            disabledAt: null,
          },
          data: {
            stock: {
              decrement: 1,
            },
          },
        });

        if (updateResult.count === 0) {
          throw new CouponCodeOutOfStockError();
        }

        let couponCodeRedeem = await transactionManager.couponCodeRedeem.create(
          {
            data: {
              couponCodeId: foundCouponCodeAndRedeems.id,
              redeemerId: userId,
              consumed: false,
            },
          },
        );

        if (foundCouponCodeAndRedeems.type === CouponCodeTypes.FLAT_BALANCE) {
          const result = await this.triggerFlatBalanceBonus(
            userId,
            foundCouponCodeAndRedeems,
            transactionManager,
          );

          if (!result.savedProgressBonus) {
            Logger.error('Failed to trigger flat balance bonus', {
              couponCodeId: foundCouponCodeAndRedeems.id,
              userId,
            });
            throw new Error(ErrorMessages.SOMETHING_WENT_WRONG);
          }
          couponCodeRedeem = await transactionManager.couponCodeRedeem.update({
            where: {
              id: couponCodeRedeem.id,
            },
            data: {
              bonusProgressId: result.savedProgressBonus.id,
              consumed: true,
            },
          });
        }

        return couponCodeRedeem;
      },
    );
    return {
      id: redeemedCode.id,
      consumed: redeemedCode.consumed,
      createdAt: redeemedCode.createdAt,
      couponCode: {
        code: foundCouponCodeAndRedeems.code,
        config: foundCouponCodeAndRedeems.config,
        type: foundCouponCodeAndRedeems.type,
      },
      bonusProgress: null,
    };
  }

  async verifyCouponCode(code: string): Promise<boolean> {
    const foundCouponCode = await this.prismaService.couponCode.findUnique({
      where: { code },
    });

    if (!foundCouponCode) {
      throw new CouponCodeNotFoundError();
    }

    if (foundCouponCode.stock === 0) {
      throw new CouponCodeOutOfStockError();
    }

    if (foundCouponCode.expiresAt && foundCouponCode.expiresAt < new Date()) {
      throw new CouponCodeExpiredError();
    }

    if (foundCouponCode.disabledAt) {
      throw new CouponCodeDisabledError();
    }

    return true;
  }

  private async triggerFlatBalanceBonus(
    userId: string,
    couponCode: CouponCode,
    transactionManager: PrismaTransactionManager,
  ): Promise<{
    savedProgressBonus: UserBonusProgression | null;
    savedInstantBonus: UserBonusBalance | null;
  }> {
    const config = couponCode.config as CouponCodeConfig;

    const couponCodeBonus = await transactionManager.bonus.findFirst({
      where: {
        id: couponCode.bonusId,
        deletedAt: null,
      },
      include: {
        bonusTriggerProducerConfig: {
          where: {
            type: BonusTriggerConfigTypes.COUPON_CODE_FLAT,
          },
          include: {
            trigger: true,
          },
        },
      },
    });
    const triggerConfig = couponCodeBonus?.bonusTriggerProducerConfig.at(0);

    if (!couponCodeBonus || !triggerConfig) {
      Logger.error('Coupon code bonus not found or trigger config not found', {
        couponCodeId: couponCode.id,
      });
      throw new CouponCodeNotFoundError();
    }

    const hasRolloverCondition = config.rolloverTargetMultiplier > 0;

    couponCodeBonus.bonusExpiryTime = config.bonusExpiryTime ?? null;
    couponCodeBonus.rewardAmount = new Decimal(config.rewardAmount);
    couponCodeBonus.maxReward = config.maxRewardAmount
      ? new Decimal(config.maxRewardAmount)
      : null;

    triggerConfig.config = config;

    couponCodeBonus.bonusTriggerProducerConfig = [triggerConfig];
    couponCodeBonus.withdrawAfterRollover = config.withdrawAfterRollover;

    if (hasRolloverCondition) {
      couponCodeBonus.rolloverExpiryTime = config.rolloverExpiryTime ?? null;
      couponCodeBonus.rolloverAmount = new Decimal(
        config.rolloverTargetMultiplier ?? 0,
      );
      couponCodeBonus.rolloverType = RolloverTypes.RELATIVE;
    }
    couponCodeBonus.type = config.bonusType;
    couponCodeBonus.rewardType = config.rewardType;

    const couponCodeStrategy = this.bonusTriggerStrategies.getCustomStrategy(
      BonusTriggerConfigTypes.COUPON_CODE_FLAT,
      BonusTriggerTypes.PRODUCER,
    );

    if (!couponCodeStrategy) {
      Logger.error('Coupon code strategy not found', {
        couponCodeId: couponCode.id,
      });
      throw new Error(ErrorMessages.SOMETHING_WENT_WRONG);
    }

    const { savedProgressBonuses, savedInstantBonuses } =
      await this.bonusProgressHandler.handleCustomTrigger(
        [
          {
            ...couponCodeBonus,
            bonusTriggerProgressConfig: [],
            bonusTriggerConsumerConfig: [],
          },
        ],
        {
          event: {
            amount: config.rewardAmount,
            bonusId: couponCodeBonus.id,
            userId,
          },
          type: BonusTriggerConfigTypes.COUPON_CODE_FLAT,
          userId,
        },
        {
          suppressNotifications: false,
        },
        transactionManager,
      );

    return {
      savedProgressBonus: savedProgressBonuses.at(0) ?? null,
      savedInstantBonus: savedInstantBonuses.at(0) ?? null,
    };
  }

  private verifyCodeClaimConditions(
    foundCouponCodeAndRedeems:
      | ({ couponCodeRedeems: CouponCodeRedeem[]; groups: { groupId: number }[]; } & CouponCode)
      | null,
  ): { couponCodeRedeems: CouponCodeRedeem[]; groups: { groupId: number }[] } & CouponCode {
    if (!foundCouponCodeAndRedeems) {
      throw new CouponCodeNotFoundError();
    }

    if (foundCouponCodeAndRedeems.stock === 0) {
      throw new CouponCodeOutOfStockError();
    }

    if (
      foundCouponCodeAndRedeems.expiresAt &&
      foundCouponCodeAndRedeems.expiresAt < new Date()
    ) {
      throw new CouponCodeExpiredError();
    }

    if (foundCouponCodeAndRedeems.disabledAt) {
      throw new CouponCodeDisabledError();
    }

    if (foundCouponCodeAndRedeems.couponCodeRedeems.length > 0) {
      throw new CouponCodeAlreadyRedeemedError();
    }

    return foundCouponCodeAndRedeems;
  }
}
