import { HttpService } from '@nestjs/axios';
import { ConsoleLogger } from '@nestjs/common';
import { SubCommand } from 'nest-commander';
import {
  OperationOptions,
  OperationTypes,
} from 'src/cmd/slotegrator-local-test/sportsbook/command';
import { CommonOptionsCommand } from 'src/cmd/slotegrator-local-test/sportsbook/shared/common-options.command';
import { data } from 'src/cmd/slotegrator-local-test/sportsbook/shared/data';
import assert from 'node:assert';
import { RunHistoryRepository } from 'src/cmd/slotegrator-local-test/sportsbook/repository/run-history.repository';

@SubCommand({
  name: 'bet' as OperationTypes,
  options: {
    isDefault: false,
  },
})
export class SlotegratorSportsbookBetCommand extends CommonOptionsCommand<
  (typeof data.bet)[0]
> {
  constructor(
    protected readonly httpService: HttpService,
    protected readonly logger: ConsoleLogger,
    protected readonly runHistoryRepository: RunHistoryRepository,
  ) {
    super(logger, httpService, runHistoryRepository, data.bet.at(0)!);
  }

  private betRequestData = data.bet.at(1)!;

  async run(_: string[], options: OperationOptions): Promise<void> {
    const { amount, userId, verbose } = options;
    this.setLogLevels(verbose);

    await this.runBalanceRequest(userId);

    this.updateBetData(this.betRequestData, userId, amount);

    const betResponse = await this.makeRequest(
      this.betRequestData.request.url,
      this.betRequestData.request.method,
      this.betRequestData.request.body,
    );

    this.logger.verbose({
      betResponse,
      message: 'Bet response',
    });
    await this.saveBetPlacing(this.betRequestData.request.body);
    assert.equal(
      this.betRequestData.response.balance,
      betResponse.balance,
      'Bet response balance differs from the expected balance',
    );
  }
}
