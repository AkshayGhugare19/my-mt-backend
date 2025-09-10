import { extendApi } from '@anatine/zod-openapi';
import { EnumValues, getValues } from '@common/enums/common';
import { z } from 'zod';

export const BonusRewardTypes = {
  PERCENTAGE: 'percentage',
  FLAT: 'flat',
} as const;

export type BonusRewardType = EnumValues<typeof BonusRewardTypes>;
export const BonusRewardTypeSchema = extendApi(
  z.enum(getValues(BonusRewardTypes)),
);
