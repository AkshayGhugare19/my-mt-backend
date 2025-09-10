import { HttpService } from '@nestjs/axios';
import { ConsoleLogger } from '@nestjs/common';
import { SubCommand } from 'nest-commander';
import {
  OperationOptions,
  OperationTypes,
} from 'src/cmd/slotegrator-local-test/sportsbook/command';
import { data } from 'src/cmd/slotegrator-local-test/sportsbook/shared/data';
import { RunHistoryRepository } from 'src/cmd/slotegrator-local-test/sportsbook/repository/run-history.repository';
import assert from 'assert';
import { CommonSettleCommand } from 'src/cmd/slotegrator-local-test/sportsbook/shared/common-settle.command';

@SubCommand({
  name: 'commit' as OperationTypes,
  options: {
    isDefault: false,
  },
})
export class SlotegratorSportsbookCommitCommand extends CommonSettleCommand<
  (typeof data.commit)[1]
> {
  private readonly commitRequestData = data.commit[1];

  constructor(
    protected readonly httpService: HttpService,
    protected readonly logger: ConsoleLogger,
    protected readonly runHistoryRepository: RunHistoryRepository,
  ) {
    super(logger, httpService, runHistoryRepository, data.commit.at(0)!);
  }

  async run(
    _: string[],
    options: OperationOptions & {
      betTransactionId?: string;
      last?: boolean;
      noSettle?: boolean;
    },
  ): Promise<void> {
    const { userId, verbose, amount, betTransactionId, last } =
      options;
    let targetBetTransactionId = betTransactionId;

    if (!last && !targetBetTransactionId) {
      throw new Error('Bet transaction id is required');
    }

    if (last) {
      const id = await this.runHistoryRepository.getLastOpenBetTransactionId();

      if (!id) {
        throw new Error('No bet found');
      }

      targetBetTransactionId = id;
    }

    let bet = await this.runHistoryRepository.getBetByTransactionId(
      targetBetTransactionId!,
    );

    if (!bet) {
      throw new Error('Bet not found');
    }

    bet = bet.bet as (typeof data.bet)[1]['request']['body'];

    this.loadRunId(targetBetTransactionId!);
    this.setLogLevels(verbose);

    await this.runBalanceRequest(userId);

    this.updateBetData<(typeof data.commit)[1]>(this.commitRequestData, userId, amount);

    this.commitRequestData.request.body.betslip_id = bet.betslip_id;
    this.commitRequestData.request.body.player_id = bet.player_id;

    const response = await this.makeRequest(
      this.commitRequestData.request.url,
      this.commitRequestData.request.method,
      this.commitRequestData.request.body,
    );

    assert.equal(
      response.balance,
      this.commitRequestData.response.balance,
      'Win response balance differs from the expected balance',
    );
  }
}
