import { extendApi } from '@anatine/zod-openapi';
import { EnumValues, getValues } from '@common/enums/common';
import { z } from 'zod';

export const BonusTypes = {
  INSTANT: 'instant',
  PROGRESS: 'progress',
} as const;

export type BonusType = EnumValues<typeof BonusTypes>;
export const BonusTypeSchema = extendApi(z.enum(getValues(BonusTypes)));
