import { ParsedBetInfo } from '@modules/bonus/handlers/strategy/types';
import { Bet, BonusTriggerConsumerConfig } from '@prisma/client';

export interface BonusBalanceScoreStrategy {
  calculateScore(
    consumerConfig: BonusTriggerConsumerConfig,
    bet: Bet,
    betInfo: ParsedBetInfo,
  ): number | null;
}
