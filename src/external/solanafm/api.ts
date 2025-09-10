/* eslint-disable sonarjs/prefer-single-boolean-return */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Bottleneck from 'bottleneck';
import { ENV } from '@common/env';
import { AxiosResponse } from 'axios';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { SOLANA_DEPOSIT_PUBLIC_KEY_SECRET } from '@infrastructure/secrets/config';
import { AccountTransfersParams } from './params';
import { AccountTransfersResponse, Instruction, Transfer } from './responses';

@Injectable()
export class SolanafmApi {
  private readonly _logger = new Logger(SolanafmApi.name);
  private readonly bottleneck: Bottleneck;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly secretsService: SecretsService,
  ) {
    this.bottleneck = new Bottleneck({
      maxConcurrent: 1,
      minTime: 100,
    });
  }

  async getAccountTransfers(
    hash: string,
    params: AccountTransfersParams,
  ): Promise<AccountTransfersResponse | undefined> {
    const headers = {
      ApiKey: this.configService.get<string>(ENV.SOLANAFM_API_KEY),
    };

    try {
      return (
        await this.bottleneck.schedule<AxiosResponse<AccountTransfersResponse>>(
          () =>
            this.httpService.axiosRef.get(
              `https://api.solana.fm/v0/accounts/${hash}/transfers`,
              {
                headers,
                params,
              },
            ),
        )
      ).data;
    } catch (error) {
      this._logger.error(error);
    }
  }

  getPayTxFeesInstruction(transfer: Transfer): Instruction | undefined {
    return transfer.data.find(
      (instruction) =>
        instruction.action === 'pay_tx_fees' &&
        instruction.status === 'Successful',
    );
  }

  getTransferInstruction(transfer: Transfer): Instruction | undefined {
    return transfer.data.find(
      (instruction) =>
        (instruction.action === 'transfer' ||
          instruction.action === 'transferChecked') &&
        instruction.status === 'Successful',
    );
  }

  getCreateAccountInstruction(transfer: Transfer): Instruction | undefined {
    return transfer.data.find(
      (instruction) =>
        instruction.action === 'createAccount' &&
        instruction.status === 'Successful',
    );
  }

  async isTokenTransfer(transfer: Transfer): Promise<'USDT' | 'USDC' | undefined> {
    const transferInstruction = this.getTransferInstruction(transfer);

    if (!transferInstruction) return undefined;

    const usdtMint = this.configService.get<string>(
      ENV.SOLANA_USDT_CONTRACT_ADDRESS,
    );
    const usdcMint = this.configService.get<string>(
      ENV.SOLANA_USDC_CONTRACT_ADDRESS,
    );

    if (
      transferInstruction.token !== usdtMint &&
      transferInstruction.token !== usdcMint
    ) { return undefined; }

    const depositAddress = await this.secretsService.getSecretOrFail(
      SOLANA_DEPOSIT_PUBLIC_KEY_SECRET,
    );

    if (transferInstruction.destination !== depositAddress) return undefined;

    return transferInstruction.token === usdtMint
      ? 'USDT'
      : transferInstruction.token === usdcMint
        ? 'USDC'
        : undefined;
  }

  async isLamportsTransfer(transfer: Transfer): Promise<boolean> {
    const transferInstruction = this.getTransferInstruction(transfer);

    if (!transferInstruction) return false;

    const depositAddress = await this.secretsService.getSecretOrFail(
      SOLANA_DEPOSIT_PUBLIC_KEY_SECRET,
    );

    if (transferInstruction.destination !== depositAddress) return false;

    return true;
  }
}
