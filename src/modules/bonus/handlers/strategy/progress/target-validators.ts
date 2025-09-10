/* eslint-disable sonarjs/prefer-single-boolean-return */
import {
  BonusTriggerTarget,
  BonusTriggerTargets,
  RolloverTypes,
} from '@modules/bonus/enum';
import {
  categoryValidator,
  gameIdValidator,
  maxOddsValidator,
  minOddsValidator,
  providerIdValidator,
  sportIdValidator,
} from '@modules/bonus/handlers/shared';
import { ParsedBetInfo } from '@modules/bonus/handlers/strategy/types';
import { BonusTriggerConfig } from '@modules/bonus/schema/trigger';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { Injectable } from '@nestjs/common';
import { Bet, Bonus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

type TargetValidatorPayload = {
  bonus: Bonus;
  originalBet: Bet;
  parsedBet: ParsedBetInfo;
  triggerConfig: BonusTriggerConfig;
};

@Injectable()
export class TargetValidators {
  constructor(private readonly asyncLogService: AsyncLogService) {}

  validate(
    target: BonusTriggerTarget | null,
    params: TargetValidatorPayload,
  ): boolean {
    switch (target) {
      case BonusTriggerTargets.GLOBAL:
        return this.globalTargetValidator(params);
      case BonusTriggerTargets.SPORTS_BOOK:
        return this.sportsBookTargetValidator(params);
      case BonusTriggerTargets.SPORTS_EXCHANGE:
        return this.sportsExchangeTargetValidator(params);
      case BonusTriggerTargets.GAME:
        return this.gameTargetValidator(params);
      default:
        return false;
    }
  }

  globalTargetValidator({
    originalBet,
    bonus,
    parsedBet,
    triggerConfig,
  }: TargetValidatorPayload): boolean {
    const satisfiesMinOdds = minOddsValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesMinOdds, parsedBet, triggerConfig },
      'targetValidator.nullTargetValidator.satisfiesMinOdds',
    );
    if (!satisfiesMinOdds) return false;

    const satisfiesMaxOdds = maxOddsValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesMaxOdds, parsedBet, triggerConfig },
      'targetValidator.nullTargetValidator.satisfiesMaxOdds',
    );
    if (!satisfiesMaxOdds) return false;

    const satisfiesRolloverPercentage = this.validateRolloverPercentage(
      originalBet,
      triggerConfig,
      bonus,
    );
    this.asyncLogService.log(
      { satisfiesRolloverPercentage, parsedBet, triggerConfig },
      'targetValidator.nullTargetValidator.satisfiesRolloverPercentage',
    );
    if (!satisfiesRolloverPercentage) {
      return false;
    }

    return true;
  }

  sportsBookTargetValidator({
    bonus,
    originalBet,
    parsedBet,
    triggerConfig,
  }: TargetValidatorPayload): boolean {
    const satisfiesMinOdds = minOddsValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesMinOdds, parsedBet, triggerConfig },
      'targetValidator.sportsBookTargetValidator.satisfiesMinOdds',
    );
    if (!satisfiesMinOdds) return false;

    const satisfiesMaxOdds = maxOddsValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesMaxOdds, parsedBet, triggerConfig },
      'targetValidator.sportsBookTargetValidator.satisfiesMaxOdds',
    );
    if (!satisfiesMaxOdds) return false;

    const satisfiesSportId = sportIdValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesSportId, parsedBet, triggerConfig },
      'targetValidator.sportsBookTargetValidator.satisfiesSportId',
    );
    if (!satisfiesSportId) return false;

    const satisfiesRolloverPercentage = this.validateRolloverPercentage(
      originalBet,
      triggerConfig,
      bonus,
    );
    this.asyncLogService.log(
      { satisfiesRolloverPercentage, parsedBet, triggerConfig },
      'targetValidator.sportsBookTargetValidator.satisfiesRolloverPercentage',
    );
    if (!satisfiesRolloverPercentage) {
      return false;
    }

    return true;
  }

  // eslint-disable-next-line sonarjs/no-identical-functions
  sportsExchangeTargetValidator({
    bonus,
    originalBet,
    parsedBet,
    triggerConfig,
  }: TargetValidatorPayload): boolean {
    const satisfiesMinOdds = minOddsValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesMinOdds, parsedBet, triggerConfig },
      'targetValidator.sportsExchangeTargetValidator.satisfiesMinOdds',
    );
    if (!satisfiesMinOdds) return false;

    const satisfiesMaxOdds = maxOddsValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesMaxOdds, parsedBet, triggerConfig },
      'targetValidator.sportsExchangeTargetValidator.satisfiesMaxOdds',
    );
    if (!satisfiesMaxOdds) return false;

    const satisfiesSportId = sportIdValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesSportId, parsedBet, triggerConfig },
      'targetValidator.sportsExchangeTargetValidator.satisfiesSportId',
    );
    if (!satisfiesSportId) return false;

    const satisfiesRolloverPercentage = this.validateRolloverPercentage(
      originalBet,
      triggerConfig,
      bonus,
    );
    this.asyncLogService.log(
      { satisfiesRolloverPercentage, parsedBet, triggerConfig },
      'targetValidator.sportsExchangeTargetValidator.satisfiesRolloverPercentage',
    );
    if (!satisfiesRolloverPercentage) {
      return false;
    }

    return true;
  }

  gameTargetValidator({
    bonus,
    originalBet,
    parsedBet,
    triggerConfig,
  }: TargetValidatorPayload): boolean {
    const satisfiesMinOdds = minOddsValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesMinOdds, parsedBet, triggerConfig },
      'targetValidator.gameTargetValidator.satisfiesMinOdds',
    );
    if (!satisfiesMinOdds) return false;

    const satisfiesMaxOdds = maxOddsValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesMaxOdds, parsedBet, triggerConfig },
      'targetValidator.gameTargetValidator.satisfiesMaxOdds',
    );
    if (!satisfiesMaxOdds) return false;

    const satisfiesProviderId = providerIdValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesProviderId, parsedBet, triggerConfig },
      'targetValidator.gameTargetValidator.satisfiesProviderId',
    );
    if (!satisfiesProviderId) return false;

    const satisfiesGameId = gameIdValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesGameId, parsedBet, triggerConfig },
      'targetValidator.gameTargetValidator.satisfiesGameId',
    );
    if (!satisfiesGameId) return false;

    const satisfiesCategory = categoryValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesCategory, parsedBet, triggerConfig },
      'targetValidator.gameTargetValidator.satisfiesCategory',
    );
    if (!satisfiesCategory) return false;

    const satisfiesRolloverPercentage = this.validateRolloverPercentage(
      originalBet,
      triggerConfig,
      bonus,
    );
    this.asyncLogService.log(
      { satisfiesRolloverPercentage, parsedBet, triggerConfig },
      'targetValidator.gameTargetValidator.satisfiesRolloverPercentage',
    );
    if (!satisfiesRolloverPercentage) {
      return false;
    }

    return true;
  }

  validateRolloverPercentage(
    bet: Bet,
    config: BonusTriggerConfig,
    bonus: Pick<Bonus, 'rolloverType'>,
  ): boolean {
    if (!bet.settlementAmount || !config.rolloverPercentage) return false;
    if (bonus.rolloverType === RolloverTypes.FIXED) {
      return new Decimal(bet.settlementAmount)
        .abs()
        .gte(new Decimal(config.rolloverPercentage));
    } else {
      const rolloverAmount = new Decimal(bet.settlementAmount)
        .abs()
        .mul(100)
        .div(new Decimal(bet.betAmount));
      return rolloverAmount.gt(new Decimal(config.rolloverPercentage));
    }
  }
}
