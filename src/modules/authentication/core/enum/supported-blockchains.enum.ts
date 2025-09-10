import { getValues } from '@common/enums/common';
import { z } from 'zod';

export const SupportedBlockchains = {
  SOLANA: 'solana',
  ETHEREUM: 'ethereum',
  TRON: 'tron',
  BNB: 'bnb',
  ARBITRUM: 'arbitrum',
} as const;

export const SupportedBlockchainsSchema = z.enum(
  getValues(SupportedBlockchains),
);

export type SupportedBlockchain = z.infer<typeof SupportedBlockchainsSchema>;
