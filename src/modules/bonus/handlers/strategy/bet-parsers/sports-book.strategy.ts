import { ProviderStrategy } from '@modules/bonus/handlers/strategy/bet-parsers/strategy';
import { ParsedBetInfo } from '@modules/bonus/handlers/strategy/types';
import { GamesService } from '@modules/games/service/games.service';
import { Injectable } from '@nestjs/common';
import { Bet } from '@prisma/client';

@Injectable()
export class SportsBookStrategy implements ProviderStrategy {
  constructor(private readonly gamesService: GamesService) {}

  async parseBet(bet: Bet): Promise<ParsedBetInfo> {
    throw new Error('This strategy is not implemented');
    // const metadata = <FungamessBetMetadata<SportsbookPlaceBetMetadata>>(
    //   bet.metadata
    // );

    // const game = await this.gamesService.getFungamessGameById(
    //   parseInt(metadata.placeBet.gameId),
    // );

    // return {
    //   gameId: metadata.placeBet.gameId,
    //   category: game?.category || null,
    //   minOdds: metadata.placeBet.extraData.betslip.bets.reduce(
    //     (acc, b) => (parseInt(b.odds) < acc ? parseInt(b.odds) : acc),
    //     Infinity,
    //   ),
    //   maxOdds: metadata.placeBet.extraData.betslip.bets.reduce(
    //     (acc, b) => (parseInt(b.odds) > acc ? parseInt(b.odds) : acc),
    //     -Infinity,
    //   ),
    //   providerId: game?.providerId ? `${game.providerId}` : null,
    //   provider: bet.provider || null,
    //   sportId: metadata.placeBet.extraData.betslip.bets.reduce((acc, b) => {
    //     if (acc === undefined) {
    //       return b.sport_name;
    //     }
    //     if (acc !== b.sport_name) {
    //       return null;
    //     }
    //     return acc;
    //   }, undefined) || null,
    // };
  }
}
