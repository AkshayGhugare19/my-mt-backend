import { extendApi } from '@anatine/zod-openapi';
import { EnumValues, getValues } from '@common/enums/common';
import { z } from 'zod';

export const RolloverTypes = {
  RELATIVE: 'relative',
  FIXED: 'fixed',
} as const;

export type RolloverType = EnumValues<typeof RolloverTypes>;
export const RolloverTypeSchema = extendApi(z.enum(getValues(RolloverTypes)));
