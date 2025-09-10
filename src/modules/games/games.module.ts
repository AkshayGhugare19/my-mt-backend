import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { GamesController } from './controller/games.controller';
import { GamesService } from './service/games.service';
import { SyncGuard } from '@modules/authentication/core/guards/sync.guard';
import { AdminGamesController } from '@modules/games/controller/games-admin.controller';
import { HttpModule } from '@nestjs/axios';
import { CountryProvidersBlacklistModule } from '@modules/country-providers/country-providers-blacklist.module';

@Module({
  imports: [PrismaModule, HttpModule.register({}), CountryProvidersBlacklistModule],
  controllers: [GamesController, AdminGamesController],
  providers: [GamesService, SyncGuard],
  exports: [GamesService],
})
export class GamesModule {}
