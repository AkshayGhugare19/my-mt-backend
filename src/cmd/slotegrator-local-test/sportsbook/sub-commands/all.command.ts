import { HttpService } from '@nestjs/axios';
import { ConsoleLogger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToNumber } from '@utils/decimal-do-number';
import assert from 'assert';
import { readFileSync } from 'fs';
import { CommandRunner, Option, SubCommand } from 'nest-commander';
import { lastValueFrom } from 'rxjs';
import { defaultLogLevels } from 'src/cmd/slotegrator-local-test/cli';
import {
  OperationOptions,
  OperationTypes,
} from 'src/cmd/slotegrator-local-test/sportsbook/command';

type CommonRequest = {
  request: {
    id: string;
    url: string;
    method: string;
    body: Record<string, unknown>;
  };
  response: {
    balance: number;
  };
};

type BalanceRequest = CommonRequest & {
  request: {
    body: {
      action: 'balance';
      currency: string;
      player_id: string;
      session_id: string;
    };
  };
};

type PlaceBetRequest = CommonRequest & {
  request: {
    body: {
      action: 'bet';
      currency: string;
      sportsbook_uuid: string;
      player_id: string;
      session_id: string;
      betslip_id: string;
      betslip: {
        uuid: string;
        provider_betslip_id: string;
        status: string;
        amount: number;
        currency: string;
        items: [];
        parameters: {
          is_quick_bet: boolean;
        };
      };
      transaction_id: string;
    };
  };
  response: {
    transaction_id: string;
  };
};

type WinRequest = CommonRequest & {
  request: {
    body: {
      action: 'win';
      amount: number;
      currency: string;
      sportsbook_uuid: string;
      player_id: string;
      session_id: string;
      betslip_id: string;
      betslip: {
        uuid: string;
        provider_betslip_id: string;
        status: string;
        amount: number;
        currency: string;
        items: [];
      };
      transaction_id: string;
    };
  };
  response: {
    transaction_id: string;
  };
};

type SettleRequest = CommonRequest & {
  request: {
    body: {
      action: 'settle';
      betslip_id: string;
      player_id: string;
      currency: string;
    };
  };
};

type RefundRequest = CommonRequest & {
  request: {
    body: {
      amount: number;
      currency: string;
      sportsbook_uuid: string;
      player_id: string;
      session_id: string;
      betslip_id: string;
      transaction_id: string;
      ref_transaction_id: string;
      type: 'default';
      action: 'refund';
    };
  };
  response: {
    transaction_id: string;
  };
};

type RollbackRequest = CommonRequest & {
  request: {
    body: {
      action: 'rollback';
      currency: string;
      player_id: string;
      betslip_id: string;
      transaction_id: string;
      bet_transaction_id: string;
      parent_transaction_id: string;
      amount: number;
      session_id: string;
    };
  };
  response: {
    transaction_id: string;
  };
};

@SubCommand({
  name: 'all' as OperationTypes,
  options: {
    isDefault: false,
  },
})
export class SlotegratorSportsbookAllCommand extends CommandRunner {
  private readonly runId = Date.now();

  constructor(
    protected readonly logger: ConsoleLogger,
    protected readonly httpService: HttpService,
  ) {
    super();
  }

  async run(
    _: string[],
    options: Pick<OperationOptions, 'userId' | 'verbose'>,
  ): Promise<void> {
    try {
      this.setLogLevels(options.verbose);
      this.logger.log('Running all tests');
      const data = readFileSync(
        'src/cmd/slotegrator-local-test/sportsbook/shared/full-data.json',
        'utf-8',
      );
      const parsedData = JSON.parse(data)['slotegrator-sportsbook'];
      const currentBalance = await this.makeRequest(
        parsedData.at(0)!.request.id,
        parsedData.at(0)!.request.url,
        parsedData.at(0)!.request.method,
        { ...parsedData.at(0)!.request.body, player_id: options.userId },
      );

      this.logger.log(`Current balance: ${JSON.stringify(currentBalance)}`);
      if (!parsedData.at(0)!.response.balance) {
        throw new Error(
          'Balance is not set ' + parsedData.at(0)!.response.balance,
        );
      }
      const balanceAdjustment = decimalToNumber(
        new Decimal(currentBalance.balance).minus(
          parsedData.at(0)!.response.balance,
        ),
        2,
      );
      let index = 0;
      for (const item of parsedData) {
        const transformedItem = this.parseItem(
          item,
          options,
          balanceAdjustment,
        );
        this.logger.log(`Running request: ${index++} of ${parsedData.length}`);
        const response = await this.makeRequest(
          transformedItem.request.id,
          transformedItem.request.url,
          transformedItem.request.method,
          transformedItem.request.body,
        );

        this.logger.verbose(response);

        if (response.error_code) {
          assert.equal(
            response.error_code,
            transformedItem.response.error_code,
            `Error code mismatch for ${transformedItem.request.id}`,
          );
          assert.equal(
            response.error_description,
            transformedItem.response.error_description,
            `Error description mismatch for ${transformedItem.request.id}`,
          );
          continue;
        }

        assert.equal(
          response.balance,
          transformedItem.response.balance,
          `Balance mismatch for ${transformedItem.request.id}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } catch (error) {
      this.logger.error(error);
      this.logger.error(error.stack);
      throw error;
    }
  }

  private parseItem(
    item: any,
    options: Pick<OperationOptions, 'userId' | 'verbose'>,
    balanceAdjustment: number,
  ): any {
    const endpointTermination = item.request.url.split('/').at(-1);

    switch (endpointTermination) {
      case 'balance':
        return this.updateBalanceRequest(
          options.userId,
          item,
          balanceAdjustment,
        );
      case 'bet':
        return this.updatePlaceBetRequest(
          options.userId,
          item,
          balanceAdjustment,
        );
      case 'win':
        return this.updateWinRequest(options.userId, item, balanceAdjustment);
      case 'settle':
        return this.updateSettleRequest(
          options.userId,
          item,
          balanceAdjustment,
        );
      case 'refund':
        return this.updateRefundRequest(
          options.userId,
          item,
          balanceAdjustment,
        );
      case 'rollback':
        return this.updateRollbackRequest(
          options.userId,
          item,
          balanceAdjustment,
        );
      default:
        throw new Error(`Unknown endpoint termination: ${endpointTermination}`);
    }
  }

  protected async makeRequest(
    id: string,
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
      this.logger.verbose(`Running request: ${id}`);
      const { data } = await lastValueFrom(response);
      return data;
    } catch (error) {
      this.logger.verbose(
        {
          id,
          baseURL: this.httpService.axiosRef.defaults.baseURL,
          url,
          method,
          error: error?.response?.message ?? error,
          errorData: error?.response?.data,
        },
        'SlotegratorSportsbookAllCommand.makeRequest',
      );
      return error.response;
    }
  }

  private updateBalanceRequest(
    userId: string,
    data: BalanceRequest,
    balanceAdjustment: number,
  ): BalanceRequest {
    data.request.body.player_id = userId;
    if ((data.response as any).error_code) {
      return data;
    }
    data.response.balance = decimalToNumber(
      new Decimal(data.response.balance).plus(balanceAdjustment),
      2,
    );
    return data;
  }

  private updatePlaceBetRequest(
    userId: string,
    data: PlaceBetRequest,
    balanceAdjustment: number,
  ): PlaceBetRequest {
    data.request.body.player_id = userId;
    data.request.body.transaction_id = `${data.request.body.transaction_id}-${this.runId}`;
    data.request.body.betslip.uuid = `${data.request.body.betslip.uuid}-${this.runId}`;
    data.request.body.betslip_id = `${data.request.body.betslip_id}-${this.runId}`;
    if ((data.response as any).error_code) {
      return data;
    }
    data.response.balance = decimalToNumber(
      new Decimal(data.response.balance).plus(balanceAdjustment),
      2,
    );
    return data;
  }

  // eslint-disable-next-line sonarjs/no-identical-functions
  private updateWinRequest(
    userId: string,
    data: WinRequest,
    balanceAdjustment: number,
  ): WinRequest {
    data.request.body.player_id = userId;
    data.request.body.transaction_id = `${data.request.body.transaction_id}-${this.runId}`;
    data.request.body.betslip.uuid = `${data.request.body.betslip.uuid}-${this.runId}`;
    data.request.body.betslip_id = `${data.request.body.betslip_id}-${this.runId}`;
    if ((data.response as any).error_code) {
      return data;
    }
    data.response.balance = decimalToNumber(
      new Decimal(data.response.balance).plus(balanceAdjustment),
      2,
    );
    return data;
  }

  private updateSettleRequest(
    userId: string,
    data: SettleRequest,
    balanceAdjustment: number,
  ): SettleRequest {
    data.request.body.player_id = userId;
    data.request.body.betslip_id = `${data.request.body.betslip_id}-${this.runId}`;
    if ((data.response as any).error_code) {
      return data;
    }
    data.response.balance = decimalToNumber(
      new Decimal(data.response.balance).plus(balanceAdjustment),
      2,
    );
    return data;
  }

  private updateRefundRequest(
    userId: string,
    data: RefundRequest,
    balanceAdjustment: number,
  ): RefundRequest {
    data.request.body.player_id = userId;
    data.request.body.betslip_id = `${data.request.body.betslip_id}-${this.runId}`;
    data.request.body.transaction_id = `${data.request.body.transaction_id}-${this.runId}`;
    data.request.body.ref_transaction_id = `${data.request.body.ref_transaction_id}-${this.runId}`;
    if ((data.response as any).error_code) {
      return data;
    }
    data.response.balance = decimalToNumber(
      new Decimal(data.response.balance).plus(balanceAdjustment),
      2,
    );
    return data;
  }

  private updateRollbackRequest(
    userId: string,
    data: RollbackRequest,
    balanceAdjustment: number,
  ): RollbackRequest {
    data.request.body.player_id = userId;
    data.request.body.betslip_id = `${data.request.body.betslip_id}-${this.runId}`;
    data.request.body.transaction_id = `${data.request.body.transaction_id}-${this.runId}`;
    data.request.body.bet_transaction_id = `${data.request.body.bet_transaction_id}-${this.runId}`;
    data.request.body.parent_transaction_id = `${data.request.body.parent_transaction_id}-${this.runId}`;
    if ((data.response as any).error_code) {
      return data;
    }
    data.response.balance = decimalToNumber(
      new Decimal(data.response.balance).plus(balanceAdjustment),
      2,
    );
    return data;
  }

  private setLogLevels(verbose: boolean): void {
    this.logger?.setLogLevels(
      verbose ? [...defaultLogLevels, 'verbose'] : defaultLogLevels,
    );
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
}
