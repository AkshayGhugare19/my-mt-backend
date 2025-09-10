import { Bet } from '@prisma/client';
import { ParsedBetInfo } from '../types';

export interface ProviderStrategy {
  parseBet(bet: Bet): Promise<ParsedBetInfo>;
}
