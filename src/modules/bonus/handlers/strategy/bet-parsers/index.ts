import { BetParser } from '@modules/bonus/handlers/strategy/bet-parsers/bet-parser';
import { GameStrategy } from '@modules/bonus/handlers/strategy/bet-parsers/games.strategy';
import { SportsBookStrategy } from '@modules/bonus/handlers/strategy/bet-parsers/sports-book.strategy';
import { SportsExchangeStrategy } from '@modules/bonus/handlers/strategy/bet-parsers/sports-exchange.strategy';
import { GamesModule } from '@modules/games/games.module';
import { Module } from '@nestjs/common';

export * from './bet-parser';
export * from './strategy';

@Module({
  imports: [GamesModule],
  providers: [
    BetParser,
    SportsBookStrategy,
    SportsExchangeStrategy,
    GameStrategy,
  ],
  exports: [BetParser],
})
export class BetParserModule {}
