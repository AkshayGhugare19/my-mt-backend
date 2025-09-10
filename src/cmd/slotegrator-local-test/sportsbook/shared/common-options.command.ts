import { HttpService } from '@nestjs/axios';
import { ConsoleLogger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import { CommandRunner, Option } from 'nest-commander';
import assert from 'node:assert';
import { lastValueFrom } from 'rxjs';
import { defaultLogLevels } from 'src/cmd/slotegrator-local-test/cli';
import { OperationOptions } from 'src/cmd/slotegrator-local-test/sportsbook/command';
import { data } from 'src/cmd/slotegrator-local-test/sportsbook/shared/data';
import { RunHistoryRepository } from 'src/cmd/slotegrator-local-test/sportsbook/repository/run-history.repository';

export class CommonOptionsCommand<
  T extends { request: any; response: any },
> extends CommandRunner {
  protected balanceRequestData: T;
  protected runId = Date.now();
  protected balanceAdjustValue = 0;

  constructor(
    protected readonly logger: ConsoleLogger,
    protected readonly httpService: HttpService,
    protected readonly runHistoryRepository: RunHistoryRepository,
    balanceRequestData: T,
  ) {
    super();
    this.balanceRequestData = balanceRequestData;
  }

  protected async makeRequest(
    url: string,
    method: string,
    body: any,
  ): Promise<any> {
    try {
      const response = this.httpService.request({
        url,
        method,
        data: body,
      });

      const { data } = await lastValueFrom(response);
      return data;
    } catch (error) {
      this.logger.verbose(
        {
          baseURL: this.httpService.axiosRef.defaults.baseURL,
          url,
          method,
          error: error?.response?.message ?? error,
          body,
          errorData: error?.response?.data,
        },
        'SlotegratorSportsbookCommonOptionsCommand.makeRequest',
      );
      return error.response;
    }
  }

  protected updateBetData<T extends (typeof data.bet)[1] | (typeof data.commit)[1]>(
    betRequestData: T,
    userId: string,
    amount: number,
  ): void {
    const initialAmount = new Decimal(betRequestData.request.body.amount!);
    const amountAdjustValue = initialAmount.minus(amount);

    betRequestData.request.body.amount = amount;
    betRequestData.request.body.player_id = userId;
    betRequestData.request.body.betslip_id = `${betRequestData.request.body.betslip_id}-${this.runId}`;
    betRequestData.request.body.betslip!.uuid = `${betRequestData.request.body.betslip_id}-${this.runId}`;
    betRequestData.request.body.transaction_id = `${betRequestData.request.body.transaction_id}-${this.runId}`;

    betRequestData.response.balance = decimalToNumber(
      new Decimal(betRequestData.response.balance)
        .plus(this.balanceAdjustValue)
        .plus(amountAdjustValue),
      2,
    );
  }

  protected setLogLevels(verbose: boolean): void {
    this.logger?.setLogLevels(
      verbose ? [...defaultLogLevels, 'verbose'] : defaultLogLevels,
    );
  }

  async run(passedParams: string[], options: OperationOptions): Promise<void> {
    throw new Error('Not implemented');
  }

  protected updateBalanceRequestData(userId: string): void {
    this.balanceRequestData.request.body.player_id = userId;
  }

  protected loadRunId(betTransactionId: string): void {
    this.runId = parseInt(betTransactionId.split('-').at(-1)!);
  }

  protected async runBalanceRequest(userId: string): Promise<void> {
    this.updateBalanceRequestData(userId);

    const balanceResponse = await this.makeRequest(
      this.balanceRequestData.request.url,
      this.balanceRequestData.request.method,
      this.balanceRequestData.request.body,
    );
    this.logger.verbose({
      balanceBeforeBet: balanceResponse,
      message: 'Initial get balance response',
    });
    assert(
      balanceResponse.balance > 100,
      'Initial balance must be greater than 100',
    );
    this.balanceAdjustValue = decimalToNumber(
      new Decimal(balanceResponse.balance).minus(
        this.balanceRequestData.response.balance,
      ),
      2,
    );
  }

  protected async saveBetPlacing(
    bet: (typeof data.bet)[1]['request']['body'],
  ): Promise<void> {
    const fileData = await this.runHistoryRepository.getFileData();
    fileData[bet.transaction_id!] = {
      bet,
      runId: this.runId,
    };

    fileData.openBets = [...(fileData.openBets ?? []), this.runId];
    await this.runHistoryRepository.saveFileData(fileData);
  }

  protected async saveWin(
    win: (typeof data.win)[1]['request']['body'],
  ): Promise<void> {
    const fileData = await this.runHistoryRepository.getFileData();
    fileData[win.transaction_id!] = {
      win,
      runId: this.runId,
      ...(fileData[win.transaction_id!] ?? {}),
    };
    fileData.openBets = fileData.openBets.filter(
      (bet: number) => bet !== this.runId,
    );
    await this.runHistoryRepository.saveFileData(fileData);
  }

  protected async saveCashout(
    cashout: (typeof data.cashout)[1]['request']['body'],
  ): Promise<void> {
    const fileData = await this.runHistoryRepository.getFileData();
    fileData[cashout.transaction_id!] = {
      cashout,
      runId: this.runId,
      ...(fileData[cashout.transaction_id!] ?? {}),
    };
    fileData.openBets = fileData.openBets.filter(
      (bet: number) => bet !== this.runId,
    );
    await this.runHistoryRepository.saveFileData(fileData);
  }

  protected async saveRollback(
    rollback: (typeof data.rollback)[1]['request']['body'],
  ): Promise<void> {
    const fileData = await this.runHistoryRepository.getFileData();
    fileData[rollback.transaction_id!] = {
      rollback,
      runId: this.runId,
      ...(fileData[rollback.transaction_id!] ?? {}),
    };
    fileData.openBets = fileData.openBets.filter(
      (bet: number) => bet !== this.runId,
    );
    await this.runHistoryRepository.saveFileData(fileData);
  }

  protected async saveLose(
    lose: (typeof data.lose)[1]['request']['body'],
  ): Promise<void> {
    const fileData = await this.runHistoryRepository.getFileData();
    fileData[lose.transaction_id!] = {
      lose,
      runId: this.runId,
      ...(fileData[lose.transaction_id!] ?? {}),
    };
    fileData.openBets = fileData.openBets.filter(
      (bet: number) => bet !== this.runId,
    );
    await this.runHistoryRepository.saveFileData(fileData);
  }

  @Option({
    flags: '-u, --userId [string]',
    required: true,
    name: 'userId',
    description: 'The user id for the test',
  })
  parseUserId(userId: string): string {
    if (!userId) {
      throw new Error('User id is required');
    }

    return userId;
  }

  @Option({
    flags: '--verbose',
    required: false,
    name: 'verbose',
    description: 'Verbose logging',
  })
  parseVerbose(verbose: boolean): boolean {
    return verbose;
  }

  @Option({
    flags: '-a, --amount [number]',
    required: true,
    name: 'amount',
    description: `The amount for the test must be greater than 0 and in USD. 
    It represents the bet amount when you place a bet, the amount you want to settle with when you win or lose (0 for full loss, < bet amount for partial loss, > bet amount for win)`,
  })
  parseAmount(amount: number): number {
    if (!amount || amount < 0) {
      throw new Error('Amount is required');
    }

    return amount;
  }
}
