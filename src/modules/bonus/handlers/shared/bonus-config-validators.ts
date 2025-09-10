import { ParsedBetInfo } from '@modules/bonus/handlers/strategy/types';
import { BonusTriggerConfig } from '@modules/bonus/schema/trigger';

export function sportIdValidator(
  parsedBet: ParsedBetInfo,
  triggerConfig: BonusTriggerConfig,
): boolean {
  return !(
    triggerConfig.sportId &&
    (!parsedBet.sportId || parsedBet.sportId !== triggerConfig.sportId)
  );
}

export function gameIdValidator(
  parsedBet: ParsedBetInfo,
  triggerConfig: BonusTriggerConfig,
): boolean {
  return !(
    triggerConfig.gameId &&
    (!parsedBet.gameId || parsedBet.gameId !== triggerConfig.gameId)
  );
}

export function categoryValidator(
  parsedBet: ParsedBetInfo,
  triggerConfig: BonusTriggerConfig,
): boolean {
  return !(
    triggerConfig.category &&
    (!parsedBet.category || parsedBet.category !== triggerConfig.category)
  );
}

export function providerIdValidator(
  parsedBet: ParsedBetInfo,
  triggerConfig: BonusTriggerConfig,
): boolean {
  return !(
    triggerConfig.providerId &&
    (!parsedBet.providerId || parsedBet.providerId !== triggerConfig.providerId)
  );
}

export function minOddsValidator(
  parsedBet: ParsedBetInfo,
  triggerConfig: BonusTriggerConfig,
): boolean {
  return !(
    triggerConfig.minOdds &&
    (!parsedBet.minOdds || parsedBet.minOdds < triggerConfig.minOdds)
  );
}

export function maxOddsValidator(
  parsedBet: ParsedBetInfo,
  triggerConfig: BonusTriggerConfig,
): boolean {
  return !(
    triggerConfig.maxOdds &&
    (!parsedBet.maxOdds || parsedBet.maxOdds > triggerConfig.maxOdds)
  );
}
