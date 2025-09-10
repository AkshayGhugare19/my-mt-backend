import {
  BetProvider,
  BetProviders,
} from '@modules/bet/enum/bet-providers.enum';
import { BonusTriggerTarget, BonusTriggerTargets } from '@modules/bonus/enum';

export function convertBonusTargetToBetProvider(
  target: BonusTriggerTarget,
): BetProvider | null {
  switch (target) {
    case BonusTriggerTargets.SPORTS_BOOK:
    case BonusTriggerTargets.GAME:
      return BetProviders.FUNGAMESS;
    case BonusTriggerTargets.SPORTS_EXCHANGE:
      return BetProviders.SPORTS_EXCHANGE;
    case BonusTriggerTargets.GLOBAL:
      return null;
  }
  return null;
}
