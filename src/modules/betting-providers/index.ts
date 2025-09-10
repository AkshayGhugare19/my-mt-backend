import { SportsExchangeModule } from '@modules/betting-providers/sports-exchange/sports-exchange.module';
import { FungamessModule } from '@modules/betting-providers/fungamess/fungamess.module';
import { Module } from '@nestjs/common';
import { EvenBetModule } from './evenbet/evenbet.module';
import { SlotegratorModule } from './slotegrator/slotegrator.module';

@Module({
  imports: [
    SportsExchangeModule,
    FungamessModule,
    EvenBetModule,
    SlotegratorModule,
  ],
})
export class BettingProvidersModule {}
