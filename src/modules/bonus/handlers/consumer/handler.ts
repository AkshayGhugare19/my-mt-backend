import { DefaultScoreStrategy } from '@modules/bonus/handlers/consumer/strategy/default-score.strategy';
import { BonusBalanceScoreStrategy } from '@modules/bonus/handlers/consumer/strategy/types';
import { ParsedBetInfo } from '@modules/bonus/handlers/strategy/types';
import { Injectable } from '@nestjs/common';
import {
  Bet,
  BonusTriggerConsumerConfig,
  UserBonusBalance,
} from '@prisma/client';

@Injectable()
export class ConsumerHandler {
  constructor(private readonly defaultScoreStrategy: DefaultScoreStrategy) {}
  sortAndFilter({
    bet,
    betInfo,
    consumers,
    bonusBalances,
    customScoreStrategy,
  }: {
    consumers: BonusTriggerConsumerConfig[];
    bonusBalances: UserBonusBalance[];
    bet: Bet;
    betInfo: ParsedBetInfo;
    customScoreStrategy?: BonusBalanceScoreStrategy;
  }): UserBonusBalance[] {
    const configsWithScores = consumers
      .map((userBonusBalance) => {
        const score = (
          customScoreStrategy ?? this.defaultScoreStrategy
        ).calculateScore(userBonusBalance, bet, betInfo);
        return { score, data: userBonusBalance };
      })
      .filter(({ score }) => score !== null)
      .reduce((acc, { data, score }) => {
        if (!acc.get(data.bonusId)) {
          acc.set(data.bonusId, score!);
        }
        if (acc.get(data.bonusId)! > score!) {
          acc.set(data.bonusId, score!);
        }
        return acc;
      }, new Map<string, number>()) as Map<string, number>;

    const bonusBalanceMap = bonusBalances.reduce((acc, b) => {
      const bonusScore = configsWithScores.get(b.bonusId);

      if (bonusScore === undefined) return acc;

      if (!acc.get(bonusScore)) {
        acc.set(bonusScore, []);
      }

      acc.get(bonusScore)!.push(b);

      return acc;
    }, new Map<number, UserBonusBalance[]>());

    const scores = Array.from(bonusBalanceMap.keys()).sort((a, b) => a - b);

    return scores.reduce((acc, score) => {
      const balances = bonusBalanceMap.get(score);
      if (!balances) return acc;

      acc.push(
        ...balances.sort((a, b) => {
          if (a.expiresAt && b.expiresAt) {
            return a.expiresAt.getTime() - b.expiresAt.getTime();
          }
          if (a.expiresAt) return -1;
          if (b.expiresAt) return 1;
          return a.createdAt.getTime() - b.createdAt.getTime();
        }),
      );
      return acc;
    }, [] as UserBonusBalance[]);
  }
}
