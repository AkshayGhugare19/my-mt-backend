import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SlotegratorSportsbookTestCommand } from 'src/cmd/slotegrator-local-test/sportsbook/command';
import {
  SlotegratorSportsbookBetCommand,
  SlotegratorSportsbookAllCommand,
  SlotegratorSportsbookCashoutCommand,
  SlotegratorSportsbookLoseCommand,
  SlotegratorSportsbookRollbackCommand,
  SlotegratorSportsbookWinCommand,
  SlotegratorSportsbookRefundCommand,
} from './sportsbook/sub-commands';
import { RunHistoryRepository } from 'src/cmd/slotegrator-local-test/sportsbook/repository/run-history.repository';
import { ENV } from '@common/env';
import { SlotegratorSportsbookCommitCommand } from 'src/cmd/slotegrator-local-test/sportsbook/sub-commands/commit.command';
@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        baseURL: `http://localhost:${configService.get(ENV.APP_PORT)}`,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    RunHistoryRepository,
    SlotegratorSportsbookTestCommand,
    SlotegratorSportsbookBetCommand,
    SlotegratorSportsbookLoseCommand,
    SlotegratorSportsbookWinCommand,
    SlotegratorSportsbookCashoutCommand,
    SlotegratorSportsbookRollbackCommand,
    SlotegratorSportsbookAllCommand,
    SlotegratorSportsbookRefundCommand,
    SlotegratorSportsbookCommitCommand
  ],
  exports: [SlotegratorSportsbookTestCommand],
})
export class SlotegratorLocalTestModule {}
