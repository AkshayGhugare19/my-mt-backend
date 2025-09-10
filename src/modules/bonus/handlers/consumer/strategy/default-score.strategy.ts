import { BonusTriggerTarget, BonusTriggerTargets } from '@modules/bonus/enum';
import { BonusBalanceScoreStrategy } from '@modules/bonus/handlers/consumer/strategy/types';
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
import { convertBonusTargetToBetProvider } from '@modules/bonus/utils/convert-bonus-target-to-bet-provider';
import { Injectable } from '@nestjs/common';
import { Bet, BonusTriggerConsumerConfig } from '@prisma/client';

/**
 * Default score strategy for bonus balance consumer
 * Default scoring is based on the following criteria:
 * 0 - tip
 * 0 - sportId
 * 1 - gameId
 * 2 - category
 * 3 - providerId
 * 4 - provider
 */
@Injectable()
export class DefaultScoreStrategy implements BonusBalanceScoreStrategy {
  constructor(private readonly asyncLogService: AsyncLogService) {}

  /**
   * Calculate the score for a consumer config
   * !This method must run in a async storage context
   * @param consumerConfig - The consumer config
   * @param bet - The bet
   * @param betInfo - The parsed bet info
   * @returns The score or null if the consumer config is not valid
   */
  calculateScore(
    consumerConfig: BonusTriggerConsumerConfig,
    bet: Bet,
    betInfo: ParsedBetInfo,
    startScoringFrom: number = 0,
  ): number | null {
    // for targets sports_book, sports_exchange

    const canApplyConsumer = this.validateConsumerConfig({
      triggerConfig: consumerConfig.config as BonusTriggerConfig,
      parsedBet: betInfo,
      target:
        (consumerConfig.target as BonusTriggerTarget) ||
        BonusTriggerTargets.GLOBAL,
    });
    this.asyncLogService.log(
      { bet, betInfo, consumerConfig, canApplyConsumer },
      'ConsumerHandler.calculateScore.canApplyConsumer',
    );
    if (!canApplyConsumer) return null;

    if (betInfo.sportId) {
      const sportConsumer =
        (<BonusTriggerConfig>consumerConfig.config).sportId === betInfo.sportId;
      this.asyncLogService.log(
        { bet, betInfo, consumerConfig },
        'ConsumerHandler.calculateScore.sportId',
      );
      if (sportConsumer) return startScoringFrom + 0;
    }

    // for targets game
    if (betInfo.gameId) {
      const gameConsumer =
        (<BonusTriggerConfig>consumerConfig.config).gameId === betInfo.gameId;
      this.asyncLogService.log(
        { bet, betInfo, gameConsumer, consumerConfig },
        'ConsumerHandler.calculateScore.gameId',
      );
      if (gameConsumer) return startScoringFrom + 0;
    }
    // for targets game
    if (betInfo.category) {
      const categoryConsumer =
        (<BonusTriggerConfig>consumerConfig.config).category ===
        betInfo.category;
      this.asyncLogService.log(
        { consumerConfig, bet, betInfo, categoryConsumer },
        'ConsumerHandler.calculateScore.category',
      );
      if (categoryConsumer) return startScoringFrom + 1;
    }
    // for targets game
    if (betInfo.providerId) {
      const providerConsumer =
        (<BonusTriggerConfig>consumerConfig.config).providerId ===
        betInfo.providerId;
      this.asyncLogService.log(
        { consumerConfig, bet, betInfo, providerConsumer },
        'ConsumerHandler.calculateScore.providerId',
      );
      if (providerConsumer) return startScoringFrom + 1;
    }
    // for provider targets
    const providerConsumer =
      convertBonusTargetToBetProvider(
        consumerConfig.target as BonusTriggerTarget,
      ) === bet.provider;
    this.asyncLogService.log(
      { consumerConfig, bet, betInfo, providerConsumer },
      'ConsumerHandler.calculateScore.providerConsumer',
    );
    if (providerConsumer) return startScoringFrom + 2;
    return startScoringFrom + 3;
  }

  private validateConsumerConfig(params: {
    triggerConfig: BonusTriggerConfig;
    target: BonusTriggerTarget;
    parsedBet: ParsedBetInfo;
  }): boolean {
    const { parsedBet, triggerConfig, target } = params;

    const convertedTarget = convertBonusTargetToBetProvider(target);

    const satisfiesProvider = convertedTarget
      ? parsedBet.provider === convertedTarget
      : true;

    this.asyncLogService.log(
      { satisfiesProvider, parsedBet, consumerConfig: triggerConfig },
      'validateConsumerConfig.satisfiesProvider',
    );
    if (!satisfiesProvider) return false;

    const satisfiesMinOdds = minOddsValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesMinOdds, parsedBet, consumerConfig: triggerConfig },
      'validateConsumerConfig.satisfiesMinOdds',
    );
    if (!satisfiesMinOdds) return false;

    const satisfiesMaxOdds = maxOddsValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesMaxOdds, parsedBet, consumerConfig: triggerConfig },
      'validateConsumerConfig.satisfiesMaxOdds',
    );
    if (!satisfiesMaxOdds) return false;
    const satisfiesSportId = sportIdValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesSportId, parsedBet, consumerConfig: triggerConfig },
      'validateConsumerConfig.satisfiesSportId',
    );
    if (!satisfiesSportId) return false;

    const satisfiesProviderId = providerIdValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesProviderId, parsedBet, triggerConfig },
      'validateConsumerConfig.satisfiesProviderId',
    );
    if (!satisfiesProviderId) return false;

    const satisfiesGameId = gameIdValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesGameId, parsedBet, triggerConfig },
      'validateConsumerConfig.satisfiesGameId',
    );
    if (!satisfiesGameId) return false;

    const satisfiesCategory = categoryValidator(parsedBet, triggerConfig);
    this.asyncLogService.log(
      { satisfiesCategory, parsedBet, triggerConfig },
      'validateConsumerConfig.satisfiesCategory',
    );
    // eslint-disable-next-line sonarjs/prefer-single-boolean-return
    if (!satisfiesCategory) return false;

    return true;
  }
}
