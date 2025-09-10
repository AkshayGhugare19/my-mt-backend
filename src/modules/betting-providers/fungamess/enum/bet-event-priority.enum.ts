import { FungamessEventType } from '@modules/betting-providers/fungamess/enum/event-types.enum';

export const FungamessBetEventPriority: Record<FungamessEventType, number> = {
  SportBetCancel: 1,
  BetPlacingAbort: 2,
  Win: 3,
  Lose: 4,
  BetPlacing: 5,
  Cancel: 6,
} as const;
