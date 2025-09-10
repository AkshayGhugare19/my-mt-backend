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
  name: 'win' as OperationTypes,
  options: {
    isDefault: false,
  },
})
export class SlotegratorSportsbookWinCommand extends CommonSettleCommand<
  (typeof data.win)[1]
> {
  private readonly winRequestData = data.win[1];
  private readonly winSettlementData = data.win[2];

  constructor(
    protected readonly httpService: HttpService,
    protected readonly logger: ConsoleLogger,
    protected readonly runHistoryRepository: RunHistoryRepository,
  ) {
    super(logger, httpService, runHistoryRepository, data.win.at(0)!);
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

    assert(+bet.amount < +amount, 'Bet amount must be less than win amount');

    this.loadRunId(targetBetTransactionId!);
    this.setLogLevels(verbose);

    await this.runBalanceRequest(userId);

    this.updateSettlementData({
      requestData: this.winRequestData,
      settlementData: this.winSettlementData,
      bet,
      amount,
    });

    const { response, settlementResponse } = await this.runRequests(
      this.winRequestData,
      this.winSettlementData,
      noSettle,
    );

    await this.saveWin(this.winRequestData.request.body);

    if (settlementResponse) {
      assert.equal(
        settlementResponse.balance,
        response.balance,
        'Win response balance differs from the settlement response balance',
      );
    }

    assert.equal(
      response.balance,
      this.winRequestData.response.balance,
      'Win response balance differs from the expected balance',
    );

    if (settlementResponse) {
      assert.equal(
        settlementResponse.balance,
        this.winSettlementData.response.balance,
        'Win settlement response balance differs from the expected balance',
      );
    }
  }
}
