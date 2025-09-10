import { ENV } from '@common/env';
import {
  TRON_FEES_PRIVATE_KEY_SECRET,
  TRON_FEES_PUBLIC_KEY_SECRET,
} from '@infrastructure/secrets/config';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TronWeb } from 'tronweb';
import type {
  BroadcastReturn,
  ContractParamter,
  SignedTransaction,
  Transaction,
  TransactionInfo,
} from 'tronweb/lib/esm/types';

export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface PresignedTransaction {
  transaction: SignedTransaction & Transaction<ContractParamter>;
  accountLatestOperationTime: number;
}

function decodePresignedTransaction(
  encodedPresignedTransaction: string,
): PresignedTransaction {
  return JSON.parse(
    Buffer.from(encodedPresignedTransaction, 'base64').toString(),
  );
}

// const BANDWIDTH_SEND_TRX = 300;
// const ENERGY_SEND_TRX = 0;
// const BANDWIDTH_SEND_USDT = 400;
// const ENERGY_SEND_USDT = 15_000;

// const ENERGY_UNIT_MULTIPLIER = 1_000;
// const BANDWIDTH_UNIT_MULTIPLIER = 1_000;

@Injectable()
export class TronFeesService {
  private readonly _logger = new Logger(TronFeesService.name);

  private _tronInstance?: TronWeb;
  private _feesAddress?: string;

  private async tron(): Promise<{
    tron: TronWeb;
    feesAddress: string;
  }> {
    if (!this._tronInstance || !this._feesAddress) {
      const [feesPublicKey, feesPrivateKey] = [
        await this.secretsService.getSecretOrFail(TRON_FEES_PUBLIC_KEY_SECRET),
        await this.secretsService.getSecretOrFail(TRON_FEES_PRIVATE_KEY_SECRET),
      ];
      const apiUrl = this.configService.getOrThrow<string>(ENV.TRON_HOST_URL);
      const apiKey = this.configService.getOrThrow<string>(ENV.TRON_API_KEY);

      this._feesAddress = feesPublicKey;

      this._tronInstance = new TronWeb({
        fullHost: apiUrl,
        headers: {
          'TRON-PRO-API-KEY': apiKey,
        } as any,
        privateKey: feesPrivateKey,
      });
      this._tronInstance.setAddress(feesPublicKey);
    }

    return {
      tron: this._tronInstance,
      feesAddress: this._feesAddress!,
    };
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
  ) {}

  public async waitForTransaction(txId: string): Promise<TransactionInfo> {
    const { tron } = await this.tron();

    this._logger.debug(`waiting for transaction ${txId}`);

    while (true) {
      const trxInfo = await tron.trx.getTransactionInfo(txId);
      if (trxInfo.result === 'FAILED') {
        throw new Error(`transaction ${txId} failed`);
      }

      if (trxInfo.receipt) {
        this._logger.debug(`transaction ${txId} confirmed`);
        return trxInfo;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  public async getTransactionStatus(txId: string): Promise<TransactionStatus> {
    const { tron } = await this.tron();

    const trxInfo = await tron.trx.getTransactionInfo(txId);
    if (trxInfo.result === 'FAILED') {
      return 'FAILED';
    }

    return trxInfo.receipt ? 'CONFIRMED' : 'PENDING';
  }

  private parsePricesList(
    list: string,
  ): { timestamp: number; price: number }[] {
    return list.split(',').map((entry) => {
      const [timestamp, price] = entry.split(':');
      return {
        timestamp: parseInt(timestamp),
        price: parseFloat(price),
      };
    });
  }

  public async getEnergyPrice(): Promise<number> {
    const { tron } = await this.tron();

    const pricesStr = await tron.trx.getEnergyPrices();
    const prices = this.parsePricesList(pricesStr);

    if (prices.length === 0) {
      throw new Error('no prices available');
    }

    return prices[prices.length - 1].price;
  }

  public async getBandwidthPrice(): Promise<number> {
    const { tron } = await this.tron();

    const pricesStr = await tron.trx.getBandwidthPrices();
    const prices = this.parsePricesList(pricesStr);

    if (prices.length === 0) {
      throw new Error('no prices available');
    }

    return prices[prices.length - 1].price;
  }

  public async computeNeededBandwidth(
    address: string,
    targetBandwidth: number,
  ): Promise<number> {
    const { tron } = await this.tron();

    const existingBandwidth = await tron.trx.getBandwidth(address);
    return Math.max(0, targetBandwidth - existingBandwidth);
  }

  public async calculateTrxFee(
    address: string,
    bandwidthAmount: number,
    energyAmount: number,
  ): Promise<number> {
    const { tron } = await this.tron();

    const [bandwidthPrice, energyPrice, requiredBandwidth] = await Promise.all([
      this.getBandwidthPrice(),
      this.getEnergyPrice(),
      this.computeNeededBandwidth(address, bandwidthAmount),
    ]);

    // if we are missing any bandwidth, we need to pay for all of it
    const neededBandwidth = requiredBandwidth > 0 ? bandwidthAmount : 0;

    const amountInSun =
      bandwidthPrice * neededBandwidth + energyPrice * energyAmount;
    return parseFloat(tron.fromSun(amountInSun).toString());
  }

  public async estimateNeededBandwidthForEncodedPresignedTransaction(
    encodedPresignedTransaction: string,
  ): Promise<number> {
    const MAX_RESULT_SIZE = 64;
    const SIGNATURE_SIZE = 67;
    const PROTOBUF_EXTRA_SIZE = 3;

    const tx = decodePresignedTransaction(encodedPresignedTransaction);

    const pbBytesLen = Math.ceil(tx.transaction.raw_data_hex.length / 2);
    return pbBytesLen + MAX_RESULT_SIZE + SIGNATURE_SIZE + PROTOBUF_EXTRA_SIZE;
  }

  public async sendTrx(
    to: string,
    amount: number,
  ): Promise<BroadcastReturn<SignedTransaction>> {
    const { tron } = await this.tron();
    const amountInSun = tron.toSun(amount).toString();
    return tron.trx.sendTrx(to, parseFloat(amountInSun));
  }

  public async sendEncodedPresignedTransaction(
    encodedPresignedTransaction: string,
  ): Promise<
    BroadcastReturn<SignedTransaction & Transaction<ContractParamter>>
  > {
    const { tron } = await this.tron();

    const tx = decodePresignedTransaction(encodedPresignedTransaction);
    return tron.trx.sendRawTransaction(tx.transaction);
  }
}
