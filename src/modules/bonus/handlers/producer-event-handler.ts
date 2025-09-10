import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { BonusBalanceUpdateEvent } from '@infrastructure/event/classes';
import { EventNamespace } from '@infrastructure/event/namespace';
import {
  BonusProgressStatuses,
  BonusTriggerConfigType,
  BonusTriggerConfigTypes,
  BonusTriggerTypes,
  BonusTypes,
} from '@modules/bonus/enum';
import { BonusTriggerStrategies } from '@modules/bonus/handlers/strategy/bonus-trigger-strategies';
import { ProducerStrategy } from '@modules/bonus/handlers/strategy/strategy';
import { DepositProducerTriggerConfig } from '@modules/bonus/schema/trigger';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { BonusBalanceService } from '@modules/bonus/service/bonus-balance.service';
import { BonusNotificationService } from '@modules/bonus/service/bonus-notification.service';
import { BonusProgressionService } from '@modules/bonus/service/bonus-progression.service';
import { BonusService } from '@modules/bonus/service/bonus.service';
import {
  AdminEventData,
  BonusWithTriggers,
  CreateUserBonusBalance,
  CreateUserBonusProgression,
  BonusEventPayload,
  CreateUserBonusBalanceWithCallbacks,
  CreateUserBonusProgressionWithCallbacks,
} from '@modules/bonus/types';
import { CouponCodeConfig } from '@modules/coupon-code/schema/validator/code-config.validator';
import { Roles } from '@modules/role/enum/role.enum';
import { RoleService } from '@modules/role/service/role.service';
import { UserConfigService } from '@modules/user-config/service/user-config.service';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CouponCodeRedeem,
  UserBonusBalance,
  UserBonusProgression,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToDollarsValue } from '@utils/decimal-to-dollar-value';

@Injectable()
export class ProducerEventHandler {
  private readonly logger = new Logger(ProducerEventHandler.name);
  constructor(
    private readonly bonusService: BonusService,
    private readonly bonusProgressService: BonusProgressionService,
    private readonly bonusBalanceService: BonusBalanceService,
    private readonly bonusTriggerStrategies: BonusTriggerStrategies,
    private readonly asyncLogService: AsyncLogService,
    private readonly bonusNotificationService: BonusNotificationService,
    private readonly roleService: RoleService,
    private readonly userConfigService: UserConfigService,
    private readonly prismaService: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handleEvent(params: BonusEventPayload): Promise<void> {
    this.asyncLogService.init(async () => {
      this.asyncLogService.log(params);

      const { type, userId } = params;

      const userRoles = await this.roleService.getUserRoles(userId);
      if (userRoles.some((role) => role.name === Roles.VIP_USER)) {
        const isBonusEnabled =
          await this.userConfigService.isUserBonusEnabled(userId);
        if (!isBonusEnabled) {
          throw new BadRequestException(
            'Setting bonus for VIP user not allowed',
          );
        }
      }

      const bonuses = await this.bonusService.findByTriggerConfigType({
        triggerType: BonusTriggerTypes.PRODUCER,
        triggerConfigType: type,
      });
      this.asyncLogService.log(bonuses, 'foundBonuses');

      if (!bonuses.length) {
        return;
      }
      const filteredBonuses = await this.filterByUserLimit(bonuses, userId);
      this.asyncLogService.log(filteredBonuses, 'filteredBonuses');

      if (!filteredBonuses.length) {
        return;
      }

      switch (type) {
        case BonusTriggerConfigTypes.ADMIN_MANUAL:
          return this.handleAdminManual(
            filteredBonuses,
            <BonusEventPayload<AdminEventData>>params,
          );
        case BonusTriggerConfigTypes.DEPOSIT:
          return this.handleDeposit(
            filteredBonuses,
            <BonusEventPayload<DepositProducerTriggerConfig>>params,
          );
        case BonusTriggerConfigTypes.BET_PLACING:
        case BonusTriggerConfigTypes.BET_SETTLEMENT:
          this.asyncLogService.log(
            {
              case: [
                BonusTriggerConfigTypes.BET_SETTLEMENT,
                BonusTriggerConfigTypes.BET_PLACING,
              ],
            },
            'filteredBonuses',
          );
      }
    });
  }

  /**
   * This method is used to handle custom triggers that are not supported by the default trigger strategies.
   * Use this method to handle custom triggers like coupon code.
   * @param bonus
   * @param event
   * @param strategy
   * @param options
   * @param transactionManager
   * @returns
   */
  async handleCustomTrigger<T extends AdminEventData>(
    bonus: BonusWithTriggers[],
    event: BonusEventPayload<T>,
    options: {
      suppressNotifications?: boolean;
    } = {},
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    savedProgressBonuses: UserBonusProgression[];
    savedInstantBonuses: UserBonusBalance[];
  }> {
    if (!this.asyncLogService.isInContext()) {
      return this.asyncLogService.init(async () => {
        return await this.handleCustomTrigger(
          bonus,
          event,
          options,
          transactionManager,
        );
      });
    }

    const { instantBonuses, progressBonuses } = await this.generateBonusEntries(
      {
        bonus,
        event,
      },
    );

    this.asyncLogService.log(
      instantBonuses,
      'handleCustomTrigger.instantBonuses',
    );
    this.asyncLogService.log(
      progressBonuses,
      'handleCustomTrigger.progressBonuses',
    );
    const { savedProgressBonuses, savedInstantBonuses } =
      await this.saveBonuses(
        {
          progressBonuses,
          instantBonuses,
          event,
          callbacks: [],
        },
        transactionManager,
      );

    if (!options.suppressNotifications) {
      this.sendNotifications(
        [...progressBonuses, ...instantBonuses.map((i) => i.bonusProgress)],
        bonus,
      ).catch((error) => {
        Logger.error(
          {
            message: error.message,
            stack: error.stack,
          },
          'ProducerEventHandler.handleCustomTrigger',
        );
      });
    }
    return {
      savedProgressBonuses,
      savedInstantBonuses,
    };
  }

  async handleAdminManual(
    bonus: BonusWithTriggers[],
    event: BonusEventPayload<AdminEventData>,
    options: {
      transactionManager?: PrismaTransactionManager;
      suppressNotifications?: boolean;
    } = {},
  ): Promise<void> {
    const filteredBonuses = bonus.filter((b) => event.event.bonusId === b.id);
    this.asyncLogService.log(
      filteredBonuses,
      'handleAdminManual.filteredBonuses',
    );

    const { instantBonuses, progressBonuses, callbacks } =
      await this.generateBonusEntries({
        bonus: filteredBonuses,
        event,
      });
    this.asyncLogService.log(
      instantBonuses,
      'handleAdminManual.instantBonuses',
    );
    this.asyncLogService.log(
      progressBonuses,
      'handleAdminManual.progressBonuses',
    );

    if (!instantBonuses.length && !progressBonuses.length) {
      return;
    }

    await this.saveBonuses(
      {
        progressBonuses,
        instantBonuses,
        event,
        callbacks,
      },
      options.transactionManager,
    );

    if (!options.suppressNotifications) {
      this.sendNotifications(
        [...progressBonuses, ...instantBonuses.map((i) => i.bonusProgress)],
        bonus,
      ).catch((error) => {
        Logger.error(
          {
            message: error.message,
            stack: error.stack,
          },
          'ProducerEventHandler.handleAdminManual',
        );
      });
    }
  }

  async handleDeposit(
    bonus: BonusWithTriggers[],
    event: BonusEventPayload<DepositProducerTriggerConfig>,
  ): Promise<void> {
    // Separate deposit bonuses from coupon code bonuses

    const { couponCodeBonuses, depositBonuses } = bonus.reduce(
      (acc, b) => {
        if (
          b.bonusTriggerProducerConfig.some(
            (t) => t.type === BonusTriggerConfigTypes.COUPON_CODE,
          )
        ) {
          acc.couponCodeBonuses.push(b);
        } else {
          acc.depositBonuses.push(b);
        }
        return acc;
      },
      {
        couponCodeBonuses: [] as BonusWithTriggers[],
        depositBonuses: [] as BonusWithTriggers[],
      },
    );

    this.asyncLogService.log(
      couponCodeBonuses,
      'handleDeposit.couponCodeBonuses',
    );
    this.asyncLogService.log(depositBonuses, 'handleDeposit.depositBonuses');

    const redeemedCodes = await this.prismaService.couponCodeRedeem.findMany({
      select: {
        id: true,
        couponCode: {
          select: {
            id: true,
            config: true,
            bonusId: true,
          },
        },
      },
      where: {
        consumed: false,
        redeemerId: event.userId,
        couponCode: {
          bonusId: {
            in: couponCodeBonuses.map((b) => b.id),
          },
        },
      },
    });
    const bonusWithCodes = redeemedCodes
      .map((r) => ({
        ...r,
        couponCode: {
          config: r.couponCode.config as CouponCodeConfig,
          bonus: couponCodeBonuses.find((b) => b.id === r.couponCode.bonusId)!,
        },
      }))
      .filter((r) => r.couponCode.bonus);

    const mappedCodeBonuses = await this.mapCodeBonus(bonusWithCodes);

    const { instantBonuses, progressBonuses, callbacks } =
      await this.generateBonusEntries({
        bonus: [...mappedCodeBonuses, ...depositBonuses],
        event,
      });

    this.asyncLogService.log(instantBonuses, 'handleDeposit.instantBonuses');
    this.asyncLogService.log(progressBonuses, 'handleDeposit.progressBonuses');

    if (!instantBonuses.length && !progressBonuses.length) {
      return;
    }

    await this.prismaService.$transaction(async (transactionManager) => {
      await this.saveBonuses(
        {
          progressBonuses,
          instantBonuses,
          event,
          callbacks: [...callbacks],
        },
        transactionManager,
      );
    });
    this.sendNotifications(
      [...progressBonuses, ...instantBonuses.map((i) => i.bonusProgress)],
      bonus,
    ).catch((error) => {
      Logger.error(
        {
          message: error.message,
          stack: error.stack,
        },
        'ProducerEventHandler.handleDeposit',
      );
    });
  }

  private async mapCodeBonus(
    bonusCodes: (Pick<CouponCodeRedeem, 'id'> & {
      couponCode: {
        config: CouponCodeConfig;
        bonus: BonusWithTriggers;
      };
    })[],
  ): Promise<BonusWithTriggers[]> {
    return bonusCodes
      .map((b) => {
        const bonus = <BonusWithTriggers>(
          JSON.parse(JSON.stringify(b.couponCode.bonus))
        );
        const trigger = bonus.bonusTriggerProducerConfig.find(
          (t) => t.type === BonusTriggerConfigTypes.COUPON_CODE,
        );
        if (!trigger) {
          this.asyncLogService.log({ bonus }, 'overrideBonusConfig.noTrigger');
          return null;
        }
        const config = b.couponCode.config as CouponCodeConfig;
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
        trigger.config.redeemId = b.id;

        // Replace the trigger with the updated config
        bonus.bonusTriggerProducerConfig = [trigger];
        return bonus;
      })
      .filter((b) => b !== null);
  }

  private async sendNotifications(
    progressBonuses: CreateUserBonusProgression[],
    bonus: BonusWithTriggers[],
  ): Promise<void> {
    for (const progress of progressBonuses) {
      if (progress.status === BonusProgressStatuses.COMPLETED) {
        await this.bonusNotificationService.notifyOnBonusReceived({
          userId: progress.userId,
          bonusName: bonus.find((b) => b.id === progress.bonusId)!.name,
          amount: decimalToDollarsValue(
            new Decimal(progress.rewardAmount.toString()),
          ),
        });

        this.eventEmitter.emit(
          EventNamespace.BONUS_BALANCE_UPDATE,
          new BonusBalanceUpdateEvent({
            userId: progress.userId,
            bonusId: progress.bonusId,
            amount: new Decimal(progress.rewardAmount.toString()),
          }),
        );
      }
      if (progress.status === BonusProgressStatuses.PENDING) {
        await this.bonusNotificationService.notifyRolloverStart({
          userId: progress.userId,
          bonusName: bonus.find((b) => b.id === progress.bonusId)!.name,
          reward: decimalToDollarsValue(
            new Decimal(progress.rewardAmount.toString()),
          ),
          rollover: decimalToDollarsValue(
            new Decimal(progress.targetProgress.toString()),
          ),
        });
        this.eventEmitter.emit(
          EventNamespace.BONUS_BALANCE_UPDATE,
          new BonusBalanceUpdateEvent({
            userId: progress.userId,
            bonusId: progress.bonusId,
            amount: new Decimal(progress.rewardAmount.toString()),
          }),
        );
      }
    }
  }

  private async saveBonuses(
    params: {
      progressBonuses: CreateUserBonusProgression[];
      instantBonuses: {
        bonusBalance: CreateUserBonusBalance;
        bonusProgress: CreateUserBonusProgression;
      }[];
      event: BonusEventPayload;
      callbacks: ((
        transactionManager: PrismaTransactionManager,
      ) => Promise<void>)[];
    },
    transactionManager?: PrismaTransactionManager,
  ): Promise<{
    savedProgressBonuses: UserBonusProgression[];
    savedInstantBonuses: UserBonusBalance[];
  }> {
    if (!transactionManager) {
      return this.prismaService.$transaction(async (transactionManager) => {
        return await this.saveBonuses(params, transactionManager);
      });
    }
    const { progressBonuses, instantBonuses, event, callbacks } = params;
    let savedProgressBonuses: UserBonusProgression[] = [];
    const savedInstantBonuses: UserBonusBalance[] = [];
    try {
      savedProgressBonuses =
        await this.bonusProgressService.createManyReturning(
          progressBonuses,
          transactionManager,
        );
    } catch (error) {
      this.logger.error({
        message: `Error creating progress bonuses for user ${event.userId}`,
        error: error.message,
        trace: error.stack,
      });
      throw error;
    }
    try {
      for (const instant of instantBonuses) {
        const savedBalance = await this.bonusBalanceService.create(
          instant.bonusBalance,
          transactionManager,
        );
        instant.bonusProgress.bonusBalanceId = savedBalance.id;
        const savedProgress = await this.bonusProgressService.create(
          instant.bonusProgress,
          transactionManager,
        );
        savedInstantBonuses.push(savedBalance);
        savedProgressBonuses.push(savedProgress);
      }
    } catch (error) {
      this.logger.error({
        message: `Error creating bonus balance for user ${event.userId}`,
        error: error.message,
        trace: error.stack,
      });
      throw error;
    }
    for (const callback of callbacks) {
      try {
        await callback(transactionManager);
      } catch (error) {
        this.logger.error({
          message: `Error executing callback for user ${event.userId}`,
          error: error.message,
          trace: error.stack,
        });
        throw error;
      }
    }
    return {
      savedProgressBonuses,
      savedInstantBonuses,
    };
  }

  private async generateBonusEntries<T extends Record<string, any>>(params: {
    bonus: BonusWithTriggers[];
    event: BonusEventPayload<T>;
  }): Promise<{
    progressBonuses: CreateUserBonusProgression[];
    instantBonuses: {
      bonusBalance: CreateUserBonusBalance;
      bonusProgress: CreateUserBonusProgression;
    }[];
    callbacks: ((
      transactionManager: PrismaTransactionManager,
    ) => Promise<void>)[];
  }> {
    const { bonus, event } = params;
    const { type } = event;
    return bonus.reduce(
      // eslint-disable-next-line sonarjs/cognitive-complexity
      async (acc, b) => {
        const strategy = this.getStrategyFromTriggerConfig(
          b.bonusTriggerProducerConfig.map(
            (t) => t.type as BonusTriggerConfigType,
          ),
        );
        if (!strategy) {
          this.asyncLogService.log(
            { bonus: b, type },
            'generateBonusEntries.noStrategyFound',
          );
          return acc;
        }

        const bonus = b;

        if (!bonus) {
          this.asyncLogService.log(
            { bonus, event: event.event },
            'generateBonusEntries.noOverriddenBonus',
          );
          return acc;
        }

        if (bonus.rolloverType && !bonus.rolloverAmount) {
          this.asyncLogService.log(
            {
              bonus,
              type,
            },
            'generateBonusEntries.noRolloverAmountFound',
          );
          this.logger.error(
            `Rollover amount not found for bonus ${bonus.id} and type ${type}`,
          );
          return acc;
        }
        const accumulator = await acc;
        if (bonus.type === BonusTypes.INSTANT) {
          const progress = await strategy.createProgressEntity({
            bonus,
            event: event.event,
          });
          this.asyncLogService.log(
            { progress },
            'generateBonusEntries.progress',
          );
          if (progress) {
            const balance = await strategy.createBonusBalanceEntity({
              bonus,
              event: event.event,
            });
            this.asyncLogService.log(
              { balance },
              'generateBonusEntries.balance',
            );
            // I want bonusbalance to be balance.createUserBonusBalance if it exists, otherwise balance
            const bonusBalance = (
              balance as CreateUserBonusBalanceWithCallbacks
            )?.createUserBonusBalance
              ? (balance as CreateUserBonusBalanceWithCallbacks)
                  .createUserBonusBalance
              : (balance as CreateUserBonusBalance);

            const bonusProgress = (
              progress as CreateUserBonusProgressionWithCallbacks
            )?.createUserBonusProgression
              ? (progress as CreateUserBonusProgressionWithCallbacks)
                  .createUserBonusProgression
              : (progress as CreateUserBonusProgression);

            if (bonusBalance) {
              accumulator.instantBonuses.push({
                bonusBalance,
                bonusProgress,
              });
            }

            if (
              (progress as CreateUserBonusProgressionWithCallbacks).callbacks
            ) {
              accumulator.callbacks.push(
                ...((progress as CreateUserBonusProgressionWithCallbacks)
                  .callbacks ?? []),
              );
            }
          }
        } else if (bonus.type === BonusTypes.PROGRESS) {
          const progress = await strategy.createProgressEntity({
            bonus,
            event: event.event,
          });
          if (progress) {
            this.asyncLogService.log(
              { progress },
              'generateBonusEntries.progress',
            );
            const bonusProgress = (
              progress as CreateUserBonusProgressionWithCallbacks
            )?.createUserBonusProgression
              ? (progress as CreateUserBonusProgressionWithCallbacks)
                  .createUserBonusProgression
              : (progress as CreateUserBonusProgression);

            accumulator.progressBonuses.push(bonusProgress);

            if (
              (progress as CreateUserBonusProgressionWithCallbacks).callbacks
            ) {
              accumulator.callbacks.push(
                ...((progress as CreateUserBonusProgressionWithCallbacks)
                  .callbacks ?? []),
              );
            }
          }
        }

        return acc;
      },
      Promise.resolve({
        progressBonuses: [] as CreateUserBonusProgression[],
        instantBonuses: [] as {
          bonusBalance: CreateUserBonusBalance;
          bonusProgress: CreateUserBonusProgression;
        }[],
        callbacks: [] as ((
          transactionManager: PrismaTransactionManager,
        ) => Promise<void>)[],
      }),
    );
  }

  private getStrategyFromTriggerConfig(
    types: BonusTriggerConfigType[],
  ): ProducerStrategy | null {
    for (const type of types) {
      const strategy = this.bonusTriggerStrategies.getCustomStrategy(
        type,
        BonusTriggerTypes.PRODUCER,
      );
      if (strategy) {
        return strategy;
      }
    }
    switch (true) {
      case types.includes(BonusTriggerConfigTypes.DEPOSIT):
        return this.bonusTriggerStrategies.depositProducerStrategy;
      case types.includes(BonusTriggerConfigTypes.ADMIN_MANUAL):
        return this.bonusTriggerStrategies.adminManualProducerStrategy;
      default:
        return null;
    }
  }

  private async filterByUserLimit(
    bonus: BonusWithTriggers[],
    userId: string,
  ): Promise<BonusWithTriggers[]> {
    const userProgressions = await this.bonusProgressService.findWhere({
      userId,
      bonusId: {
        in: bonus.map((b) => b.id),
      },
    });
    this.asyncLogService.log({ userProgressions }, 'filterByUserLimit');
    const merged = userProgressions;
    return bonus.filter((b) => {
      const userProgress = merged.filter((up) => up.bonusId === b.id);
      if (b.limitPerUser) {
        return userProgress.length < b.limitPerUser;
      }
      return true;
    });
  }
}
