import { HttpService } from '@nestjs/axios';
import { ConsoleLogger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import assert from 'assert';
import { Option, SubCommand } from 'nest-commander';
import {
  OperationOptions,
  OperationTypes,
} from 'src/cmd/slotegrator-local-test/sportsbook/command';
import { RunHistoryRepository } from 'src/cmd/slotegrator-local-test/sportsbook/repository/run-history.repository';
import { CommonSettleCommand } from 'src/cmd/slotegrator-local-test/sportsbook/shared/common-settle.command';
import { data } from 'src/cmd/slotegrator-local-test/sportsbook/shared/data';

@SubCommand({
  name: 'rollback' as OperationTypes,
  options: {
    isDefault: false,
  },
})
export class SlotegratorSportsbookRollbackCommand extends CommonSettleCommand<
  (typeof data.rollback)[1]
> {
  private readonly rollbackRequestData = data.rollback[1];

  constructor(
    protected readonly httpService: HttpService,
    protected readonly logger: ConsoleLogger,
    protected readonly runHistoryRepository: RunHistoryRepository,
  ) {
    super(logger, httpService, runHistoryRepository, data.rollback.at(0)!);
  }

  async run(
    _: string[],
    options: OperationOptions & {
      betTransactionId?: string;
      last?: boolean;
    },
  ): Promise<void> {
    const { userId, verbose, betTransactionId, last } = options;
    let { amount } = options;
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

    const betAction = Object.values(
      await this.runHistoryRepository.findLastCommandByRunId(bet.runId),
    )?.at(0) as any;

    if (!betAction) {
      throw new Error('Bet action not found');
    }

    bet = Object.values(bet).at(0) as (typeof data.bet)[1]['request']['body'];

    amount = betAction.amount! || amount;

    this.loadRunId(targetBetTransactionId!);
    this.setLogLevels(verbose);

    await this.runBalanceRequest(userId);

    const initialAmount = new Decimal(
      this.rollbackRequestData.request.body.amount!,
    );
    const amountAdjustValue = initialAmount.minus(amount);

    this.rollbackRequestData.request.body.betslip_id = bet.betslip_id;
    this.rollbackRequestData.request.body.player_id = bet.player_id;
    this.rollbackRequestData.request.body.amount = amount;
    this.rollbackRequestData.request.body.transaction_id = `${this.rollbackRequestData.request.body.transaction_id}-${this.runId}`;
    this.rollbackRequestData.request.body.bet_transaction_id =
      bet.transaction_id;
    this.rollbackRequestData.request.body.parent_transaction_id =
      betAction.transaction_id;

    this.rollbackRequestData.response.balance = decimalToNumber(
      new Decimal(this.rollbackRequestData.response.balance)
        .plus(this.balanceAdjustValue)
        .plus(amountAdjustValue),
      2,
    );
    const { response } = await this.runRequests(this.rollbackRequestData);
    await this.saveRollback(this.rollbackRequestData.request.body);

    assert.equal(
      response.balance,
      this.rollbackRequestData.response.balance,
      'Rollback response balance differs from the expected balance',
    );
  }

  @Option({
    flags: '-a, --amount [number]',
    required: false,
    name: 'amount',
    description: 'The amount to rollback',
  })
  parseAmount(amount: number): number {
    return amount;
  }
}
