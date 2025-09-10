import { HttpService } from '@nestjs/axios';
import { ConsoleLogger } from '@nestjs/common';
import assert from 'assert';
import { SubCommand } from 'nest-commander';
import {
  OperationOptions,
  OperationTypes,
} from 'src/cmd/slotegrator-local-test/sportsbook/command';
import { RunHistoryRepository } from 'src/cmd/slotegrator-local-test/sportsbook/repository/run-history.repository';
import { CommonSettleCommand } from 'src/cmd/slotegrator-local-test/sportsbook/shared/common-settle.command';
import { data } from 'src/cmd/slotegrator-local-test/sportsbook/shared/data';

@SubCommand({
  name: 'refund' as OperationTypes,
  options: {
    isDefault: false,
  },
})
export class SlotegratorSportsbookRefundCommand extends CommonSettleCommand<
  (typeof data.refund)[1]
> {
  private readonly refundRequestData = data.refund[1];
  private readonly refundSettlementData = data.refund[2];

  constructor(
    protected readonly httpService: HttpService,
    protected readonly logger: ConsoleLogger,
    protected readonly runHistoryRepository: RunHistoryRepository,
  ) {
    super(logger, httpService, runHistoryRepository, data.refund.at(0)!);
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

    this.loadRunId(targetBetTransactionId!);
    this.setLogLevels(verbose);

    await this.runBalanceRequest(userId);

    this.updateSettlementData({
      requestData: this.refundRequestData,
      settlementData: this.refundSettlementData,
      bet,
      amount,
    });

    this.refundRequestData.request.body.ref_transaction_id =
      targetBetTransactionId!;

    const { response } = await this.runRequests(
      this.refundRequestData,
      this.refundSettlementData,
      noSettle,
    );

    await this.saveCashout(this.refundRequestData.request.body);

    assert.equal(
      response.balance,
      this.refundRequestData.response.balance,
      'Refund response balance differs from the expected balance',
    );
  }
}
