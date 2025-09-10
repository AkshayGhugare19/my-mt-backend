import { Bet, Prisma } from '@prisma/client';
import { BetProviders } from '@modules/bet/enum/bet-providers.enum';
import { ProviderStrategy } from '@modules/bonus/handlers/strategy/bet-parsers/strategy';
import { SportsExchangeStrategy } from '@modules/bonus/handlers/strategy/bet-parsers/sports-exchange.strategy';
import { Injectable } from '@nestjs/common';
import { SportsBookStrategy } from '@modules/bonus/handlers/strategy/bet-parsers/sports-book.strategy';
import { FungamessBetMetadata } from '@modules/betting-providers/fungamess/types';
import { Redis } from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { SPORTS_BOOK_ID } from '@common/constants';
import { GameStrategy } from '@modules/bonus/handlers/strategy/bet-parsers/games.strategy';
import { ParsedBetInfo } from '@modules/bonus/handlers/strategy/types';
import { Decimal } from '@prisma/client/runtime/library';

class EmptyStrategy implements ProviderStrategy {
  async parseBet(bet: {
    id: string;
    userId: string;
    thirdPartyIdentifier: string;
    provider: string;
    debitTransactionId: string;
    creditTransactionId: string | null;
    metadata: Prisma.JsonValue;
    betAmount: Decimal;
    settlementAmount: Decimal | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    exposure: Decimal | null;
    previousBalance: Decimal | null;
  }): Promise<ParsedBetInfo> {
    return {
      sportId: null,
      providerId: null,
      provider: null,
      category: null,
      gameId: null,
      minOdds: null,
      maxOdds: null,
      isRollback: null,
    };
  }
}

/**
 * This class is responsible for parsing the bet information of any provider.
 * It uses the strategy pattern to determine which strategy to use based on the provider.
 * The strategy is responsible for parsing the bet information.
 */
@Injectable()
export class BetParser {
  constructor(
    @InjectRedis()
    private readonly redis: Redis,
    private readonly sportBookStrategy: SportsBookStrategy,
    private readonly sportsExchangeStrategy: SportsExchangeStrategy,
    private readonly gameStrategy: GameStrategy,
  ) {}

  private async getStrategy(bet: Bet): Promise<ProviderStrategy> {
    switch (bet.provider) {
      case BetProviders.SPORTS_EXCHANGE:
        return this.sportsExchangeStrategy;
      case BetProviders.FUNGAMESS: {
        const meta = <FungamessBetMetadata>bet.metadata;
        const sportsBookId = await this.redis.get(SPORTS_BOOK_ID);
        const gameId = meta?.placeBet?.gameId;
        if (gameId && sportsBookId && sportsBookId === gameId) {
          return this.sportBookStrategy;
        }
        return this.gameStrategy;
      }
      case BetProviders.SLOTEGRATOR_GAMES:
      case BetProviders.SLOTEGRATOR_SPORTSBOOK:
        return new EmptyStrategy();
      default:
        throw new Error('Provider not supported');
    }
  }

  async parse(bet: Bet): Promise<ParsedBetInfo> {
    const strategy = await this.getStrategy(bet);
    return strategy.parseBet(bet);
  }
}
