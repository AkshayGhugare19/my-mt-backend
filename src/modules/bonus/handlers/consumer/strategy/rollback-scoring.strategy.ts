import { DefaultScoreStrategy } from '@modules/bonus/handlers/consumer/strategy/default-score.strategy';
import { BonusBalanceScoreStrategy } from '@modules/bonus/handlers/consumer/strategy/types';
import { ParsedBetInfo } from '@modules/bonus/handlers/strategy/types';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { Injectable } from '@nestjs/common';
import { Bet, BonusTriggerConsumerConfig } from '@prisma/client';
@Injectable()
export class BetRollbackScoringStrategy implements BonusBalanceScoreStrategy {
  constructor(
    private readonly asyncLogService: AsyncLogService,
    private readonly defaultScoreStrategy: DefaultScoreStrategy,
  ) {}

  calculateScore(
    consumerConfig: BonusTriggerConsumerConfig,
    bet: Bet,
    betInfo: ParsedBetInfo,
  ): number | null {
    if (betInfo.isRollback) {
      this.asyncLogService.log(
        { bet, betInfo },
        'ConsumerHandler.calculateScore.rollback',
      );
      return 0;
    }
    return this.defaultScoreStrategy.calculateScore(
      consumerConfig,
      bet,
      betInfo,
      1,
    );
  }
}
