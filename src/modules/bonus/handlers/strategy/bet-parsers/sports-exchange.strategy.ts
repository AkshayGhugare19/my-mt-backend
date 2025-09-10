import { Bet } from '@prisma/client';
import { ParsedBetInfo } from '../types';
import { ProviderStrategy } from './strategy';
import { Injectable } from '@nestjs/common';
import { PlaceSportsExchangeBet } from '@modules/betting-providers/sports-exchange/types';

type SportsExchangeBetMetadata = {
  placeBet: PlaceSportsExchangeBet & { amount: number; exposure: number };
};

@Injectable()
export class SportsExchangeStrategy implements ProviderStrategy {
  async parseBet(bet: Bet): Promise<ParsedBetInfo> {
    const metadata = <SportsExchangeBetMetadata>bet.metadata;

    return {
      category: null,
      gameId: null,
      maxOdds: metadata.placeBet.odds,
      minOdds: metadata.placeBet.odds,
      provider: bet.provider,
      providerId: null,
      sportId: metadata.placeBet.sportId,
      isRollback: null,
    };
  }
}
