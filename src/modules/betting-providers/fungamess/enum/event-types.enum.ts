import { EnumValues } from '@common/enums/common';

export const FungamessEventTypes = {
  BET_PLACING: 'BetPlacing',
  WIN: 'Win',
  LOSS: 'Lose',
  BET_PLACING_ABORT: 'BetPlacingAbort',
  SPORT_BET_CANCEL: 'SportBetCancel',
  CANCEL: 'Cancel',
} as const;

export type FungamessEventType = EnumValues<typeof FungamessEventTypes>;
