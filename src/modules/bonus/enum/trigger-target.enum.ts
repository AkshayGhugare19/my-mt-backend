import { extendApi } from '@anatine/zod-openapi';
import { EnumValues, getValues } from '@common/enums/common';
import { z } from 'zod';

export const BonusTriggerTargets = {
  // generic targets
  SPORTS_BOOK: 'sports_book',
  SPORTS_EXCHANGE: 'sports_exchange',
  WELCOME: 'welcome',

  // category targets
  GAME: 'game',

  GLOBAL: 'global',
} as const;

export type BonusTriggerTarget = EnumValues<typeof BonusTriggerTargets>;
export const BonusTriggerTargetSchema = extendApi(
  z.enum(getValues(BonusTriggerTargets)),
);
