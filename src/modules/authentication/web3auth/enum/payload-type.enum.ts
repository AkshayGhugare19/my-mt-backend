import { getValues } from '@common/enums/common';
import { z } from 'zod';

export const Web3AuthPayloadTypes = {
  EXTERNAL: 'external',
  SOCIALS: 'socials',
} as const;

export const Web3AuthPayloadTypeSchema = z.enum(
  getValues(Web3AuthPayloadTypes),
);

export type Web3AuthPayloadType = z.infer<typeof Web3AuthPayloadTypeSchema>;
