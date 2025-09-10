import { HttpService } from '@nestjs/axios';
import { ConsoleLogger } from '@nestjs/common';
import { SubCommand } from 'nest-commander';
import { RunHistoryRepository } from 'src/cmd/slotegrator-local-test/sportsbook/repository/run-history.repository';
import {
  OperationOptions,
  OperationTypes,
} from 'src/cmd/slotegrator-local-test/sportsbook/command';
import { data } from 'src/cmd/slotegrator-local-test/sportsbook/shared/data';
import { CommonSettleCommand } from 'src/cmd/slotegrator-local-test/sportsbook/shared/common-settle.command';
import assert from 'assert';

@SubCommand({
  name: 'lose' as OperationTypes,
  options: {
    isDefault: false,
  },
})
export class SlotegratorSportsbookLoseCommand extends CommonSettleCommand<
  (typeof data.lose)[1]
> {
  private readonly loseRequestData = data.lose[1];
  private readonly loseSettlementData = data.lose[2];

  constructor(
    protected readonly httpService: HttpService,
    protected readonly logger: ConsoleLogger,
    protected readonly runHistoryRepository: RunHistoryRepository,
  ) {
    super(logger, httpService, runHistoryRepository, data.lose.at(0)!);
  }

  async run(
    _: string[],
    options: OperationOptions & {
      betTransactionId?: string;
      last?: boolean;
      noSettle?: boolean;
    },
  ): Promise<void> {
    const { userId, verbose, betTransactionId, amount, last, noSettle } =
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
    assert(
      bet.amount! >= amount,
      'Bet amount must be greater than lose amount',
    );

    this.loadRunId(targetBetTransactionId!);
    this.setLogLevels(verbose);

    await this.runBalanceRequest(userId);

    this.updateSettlementData({
      requestData: this.loseRequestData,
      settlementData: this.loseSettlementData,
      bet,
      amount,
    });

    const { response, settlementResponse } = await this.runRequests(
      this.loseRequestData,
      this.loseSettlementData,
      noSettle,
    );

    await this.saveLose(this.loseRequestData.request.body);

    if (settlementResponse) {
      assert.equal(
        settlementResponse.balance,
        response.balance,
        'Lose response balance differs from the settlement response balance',
      );
    }

    assert.equal(
      response.balance,
      this.loseRequestData.response.balance,
      'Lose response balance differs from the expected balance',
    );

    if (settlementResponse) {
      assert.equal(
        settlementResponse.balance,
        this.loseSettlementData.response.balance,
        'Lose settlement response balance differs from the expected balance',
      );
    }
  }
}
