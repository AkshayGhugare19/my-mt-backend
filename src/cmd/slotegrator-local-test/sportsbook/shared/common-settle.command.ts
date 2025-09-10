import { HttpService } from '@nestjs/axios';
import { ConsoleLogger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { Option } from 'nest-commander';
import { data } from 'src/cmd/slotegrator-local-test/sportsbook/shared/data';
import { RunHistoryRepository } from 'src/cmd/slotegrator-local-test/sportsbook/repository/run-history.repository';
import { CommonOptionsCommand } from 'src/cmd/slotegrator-local-test/sportsbook/shared/common-options.command';

export class CommonSettleCommand<
  T extends { request: any; response: any },
> extends CommonOptionsCommand<T> {
  constructor(
    protected readonly logger: ConsoleLogger,
    protected readonly httpService: HttpService,
    protected readonly runHistoryRepository: RunHistoryRepository,
    balanceRequestData: T,
  ) {
    super(logger, httpService, runHistoryRepository, balanceRequestData);
  }

  async runRequests(
    requestData: T,
    settlementData?: T,
    noSettle: boolean = false,
  ): Promise<{
    response: T['response'];
    settlementResponse?: T['response'];
  }> {
    const response: T['response'] = await this.makeRequest(
      requestData.request.url,
      requestData.request.method,
      requestData.request.body,
    );

    this.logger.verbose({
      response,
      message: 'Response',
    });
    if (!settlementData || noSettle) {
      return {
        response,
      };
    }

    const settlementResponse = await this.makeRequest(
      settlementData.request.url,
      settlementData.request.method,
      settlementData.request.body,
    );

    this.logger.verbose({
      settlementResponse,
      message: 'Win settlement response',
    });

    return {
      response,
      settlementResponse,
    };
  }

  protected updateSettlementData(params: {
    requestData: T;
    settlementData?: T;
    bet: (typeof data.bet)[1]['request']['body'];
    amount: number;
  }): void {
    const { requestData, settlementData, bet, amount } = params;
    const initialAmount = new Decimal(requestData.request.body.amount!);
    const amountAdjustValue = initialAmount.minus(amount);
    this.logger.verbose({
      requestData,
      message: 'Request data',
    });
    requestData.request.body.betslip_id = bet.betslip_id;
    requestData.request.body.player_id = bet.player_id;
    if (amount) {
      requestData.request.body.amount = amount;
    }
    if (requestData.request.body.betslip && bet.betslip) {
      requestData.request.body.betslip.uuid = bet.betslip.uuid;
    }
    requestData.request.body.transaction_id = `${requestData.request.body.transaction_id}-${this.runId}`;

    requestData.response.balance = decimalToNumber(
      new Decimal(requestData.response.balance)
        .plus(this.balanceAdjustValue)
        .minus(amountAdjustValue),
      2,
    );

    if (!settlementData) {
      return;
    }

    settlementData.request.body.player_id = bet.player_id;
    settlementData.request.body.betslip_id = bet.betslip_id;

    settlementData.response.balance = decimalToNumber(
      new Decimal(settlementData.response.balance)
        .plus(this.balanceAdjustValue)
        .minus(amountAdjustValue),
      2,
    );
  }

  @Option({
    flags: '-b, --betTransactionId [string]',
    required: false,
    name: 'betTransactionId',
    description: 'The bet you want to settle as a win',
  })
  parseBetTransactionId(betTransactionId: string): string {
    return betTransactionId;
  }

  @Option({
    flags: '-l, --last [boolean]',
    required: false,
    name: 'last',
    description: 'Settle the last bet',
  })
  parseLast(last: boolean): boolean {
    return Boolean(last);
  }

  @Option({
    flags: '-ns, --noSettle [boolean]',
    required: false,
    name: 'noSettle',
    description: 'Do not settle the bet',
  })
  parseNoSettle(noSettle: boolean): boolean {
    return Boolean(noSettle);
  }
}
