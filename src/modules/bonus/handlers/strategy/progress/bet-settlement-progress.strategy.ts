import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { BetSettledEvent } from '@modules/bet/event/bet-settled.event';
import { BonusProgressStatuses } from '@modules/bonus/enum';
import { BetParser } from '@modules/bonus/handlers/strategy/bet-parsers';
import { TargetValidators } from '@modules/bonus/handlers/strategy/progress/target-validators';
import { ProgressStrategy } from '@modules/bonus/handlers/strategy/strategy';
import { BonusTriggerValidators } from '@modules/bonus/schema/trigger';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import {
  BetSettleEventData,
  BonusProgressEvent,
  CreateUserBonusBalance,
  UpdateBonusProgression,
} from '@modules/bonus/types';
import { Injectable, Logger } from '@nestjs/common';
import { decimalToNumber } from '@utils/decimal-do-number';
import { DateTime } from 'luxon';

@Injectable()
export class BetSettlementProgressStrategy implements ProgressStrategy {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly betParser: BetParser,
    private readonly targetValidators: TargetValidators,
    private readonly asyncLogService: AsyncLogService,
  ) {}

  async calculateProgress(
    targetEvent: BonusProgressEvent<BetSettledEvent>,
  ): Promise<UpdateBonusProgression | null> {
    const { bonusProgression, event } = targetEvent;
    const { bonus } = bonusProgression;

    if (bonusProgression.expiresAt && bonusProgression.expiresAt < new Date()) {
      this.asyncLogService.log(
        {
          expiresAt: bonusProgression.expiresAt,
          now: new Date(),
          bonusProgressionId: bonusProgression.id,
        },
        'BetSettlementProgressStrategy.calculateProgress',
      );

      return null;
    }

    const bet = await this.prismaService.bet.findUnique({
      where: {
        id: event.betId,
      },
    });
    this.asyncLogService.log({ bet }, 'BetSettlementProgressStrategy.foundBet');
    if (!bet) {
      Logger.error({
        message: `Failed to find bet: betId: ${event.betId}`,
      });
      return null;
    }
    const parsedBet = await this.betParser.parse(bet);
    this.asyncLogService.log(
      { parsedBet },
      'BetSettlementProgressStrategy.parsedBet',
    );

    const { totalProgress } = await bonus.bonusTriggerProgressConfig.reduce(
      async (acc, config) => {
        const accumulator = await acc;
        const parsedConfig =
          BonusTriggerValidators.progress.betSettlement.safeParse(config);
        this.asyncLogService.log(
          { config, parsedConfig: parsedConfig.error },
          'BetSettlementProgressStrategy.parsedConfig',
        );

        if (!parsedConfig.success) {
          Logger.error({
            message: `Failed to parse bonus progress trigger config: bonusId: ${bonus.id} triggerId: ${config.id}`,
            validationError: parsedConfig.error,
          });
          return accumulator;
        }

        const configParseResult = parsedConfig.data;
        const isValid = this.targetValidators.validate(
          configParseResult.target || null,
          {
            originalBet: bet,
            bonus,
            parsedBet,
            triggerConfig: configParseResult.config,
          },
        );
        this.asyncLogService.log(
          { isValid },
          'BetSettlementProgressStrategy.betValidator',
        );

        accumulator.totalProgress += isValid
          ? decimalToNumber(bet!.betAmount ? bet!.betAmount.abs() : null)
          : 0;
        return accumulator;
      },
      Promise.resolve({ totalProgress: 0 }),
    );
    this.asyncLogService.log(
      { totalProgress },
      'BetSettlementProgressStrategy.totalProgress',
    );

    if (totalProgress <= 0 || Number.isNaN(totalProgress)) {
      return null;
    }

    return {
      id: bonusProgression.id,
      progress: totalProgress,
      status:
        totalProgress + bonusProgression.currentProgress >=
        bonusProgression.targetProgress
          ? BonusProgressStatuses.COMPLETED
          : BonusProgressStatuses.PENDING,
      claimedAt: totalProgress + bonusProgression.currentProgress >=
          bonusProgression.targetProgress
        ? DateTime.now().toJSDate()
        : null,
    };
  }

  async createBonusBalanceEntity(
    targetEvent: BonusProgressEvent<BetSettleEventData>,
  ): Promise<CreateUserBonusBalance | null> {
    const { bonusProgression, event } = targetEvent;
    const { userId } = event;

    return {
      userId,
      bonusId: bonusProgression.bonusId,
      balance: bonusProgression.rewardAmount,
      expiresAt: bonusProgression.bonus.bonusExpiryTime
        ? new Date(Date.now() + bonusProgression.bonus.bonusExpiryTime)
        : null,
    };
  }
}
