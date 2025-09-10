import { ProviderStrategy } from '@modules/bonus/handlers/strategy/bet-parsers/strategy';
import { ParsedBetInfo } from '@modules/bonus/handlers/strategy/types';
import { GamesService } from '@modules/games/service/games.service';
import { Injectable } from '@nestjs/common';
import { Bet } from '@prisma/client';

@Injectable()
export class GameStrategy implements ProviderStrategy {
  constructor(private readonly gamesService: GamesService) {}

  async parseBet(bet: Bet): Promise<ParsedBetInfo> {
    // const metadata = <FungamessBetMetadata>bet.metadata;
    // const game = await this.gamesService.getFungamessGameById(
    //   parseInt(metadata.placeBet.gameId),
    // );
    throw new Error('This strategy is not implemented');
    // return {
    //   gameId: metadata.placeBet.gameId,
    //   category: game?.category || null,
    //   provider: bet.provider,
    //   minOdds: null,
    //   maxOdds: null,
    //   providerId: game?.providerId ? `${game.providerId}` : null,
    //   sportId: null,
    //   isRollback: null,
    // };
  }
}
