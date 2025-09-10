import { TransferJob } from '@infrastructure/cron-jobs/producer/types';
import { DepositTransactionCurrency } from '@infrastructure/database/prisma/constants';
import { Decimal } from '@prisma/client/runtime/library';
import { formatTimestamp } from '@utils/format-timestamp';
import { ethers } from 'ethers';
import { BigNumber, TronWeb } from 'tronweb';
import { z } from 'zod';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { TRON_WITHDRAW_PRIVATE_KEY_SECRET } from '@infrastructure/secrets/config';

const TRX_DECIMALS = 6;
const TRX_USDT_DECIMALS = 6;
const TRX_USDC_DECIMALS = 6;
const TX_LIMIT = 200;
const TRX_TYPE = 'Transfer';

const TokenInfoSchema = z.object({
  symbol: z.string(),
  address: z.string(),
  decimals: z.number(),
  name: z.string(),
});

// Define BlockchainTransactionSchema
const BlockchainTransactionSchema = z.object({
  transaction_id: z.string(),
  token_info: TokenInfoSchema,
  block_timestamp: z.number({ coerce: true }),
  from: z.string(),
  to: z.string(),
  value: z.string().transform((value) => new Decimal(value).toNumber()),
  type: z.string(),
});

const UsdtTransactionsResponseSchema = z.object({
  data: z.array(BlockchainTransactionSchema),
  success: z.boolean(),
  meta: z.object({
    at: z.number(),
    page_size: z.number(),
  }),
});
export type UsdtTransactionsResponse = z.infer<
  typeof UsdtTransactionsResponseSchema
>;

export type TrxTransactionContract = {
  parameter: {
    value: {
      amount: number;
      owner_address: string;
      to_address: string;
    };
    type_url: string;
  };
  type: 'TransferContract' | string;
};

export type TrxTransaction = {
  ret: {
    contractRet: string;
    fee: number;
  }[];
  signature: string[];
  txID: string;
  net_usage: number;
  raw_data_hex: string;
  net_fee: number;
  energy_usage: number;
  blockNumber: number;
  block_timestamp: number;
  energy_fee: number;
  energy_usage_total: number;
  raw_data: {
    contract: TrxTransactionContract[];
    ref_block_bytes: string;
    ref_block_hash: string;
    expiration: number;
    timestamp: number;
  };
  internal_transactions: [];
};

export type TrxTransactionsResponse = {
  data: TrxTransaction[];
  success: boolean;
  meta: {
    at: number;
    page_size: number;
  };
};

export interface ILastNonceProvider {
  getLastBlockTimestamp(): Promise<number>;
  setLastBlockTimestamp(newBlockTimestamp: number): Promise<void>;
}

type TronWatchServiceConstructorParams = {
  lastNonceProvider: ILastNonceProvider;
  tronApiUrl: string;
  tronApiKey: string;
  usdtContractAddress: string;
  usdcContractAddress: string;
};

export class TronWatchService {
  private _lastNonceProvider: ILastNonceProvider;
  private _tronApiUrl: string;
  private _tronApiKey: string;
  private _usdtContractAddress: string;
  private _usdcContractAddress: string;

  constructor(params: TronWatchServiceConstructorParams) {
    this._lastNonceProvider = params.lastNonceProvider;
    this._tronApiUrl = params.tronApiUrl;
    this._tronApiKey = params.tronApiKey;
    this._usdtContractAddress = params.usdtContractAddress;
    this._usdcContractAddress = params.usdcContractAddress;
  }

  private getTransferContract(
    trxTransaction: TrxTransaction,
  ): TrxTransactionContract | undefined {
    return trxTransaction.raw_data.contract.find(
      (contract) => contract.type === 'TransferContract',
    );
  }

  private async _getAddressTransactions(params: {
    address: string;
  }): Promise<TransferJob[]> {
    const trxTransactionsResponse = await fetch(
      `${this._tronApiUrl}/v1/accounts/${params.address}/transactions?limit=${TX_LIMIT}&only_to=${true}`,
      {
        headers: {
          'TRON-PRO-API-KEY': this._tronApiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    const trxTransactions: TrxTransactionsResponse =
      await trxTransactionsResponse.json();

    const filteredTrxTransactions = trxTransactions.data.filter((transaction) =>
      this.getTransferContract(transaction),
    );

    const trxTransferJobs = filteredTrxTransactions.map((tx) => {
      const transferContract = this.getTransferContract(
        tx,
      ) as TrxTransactionContract;

      return {
        currency: DepositTransactionCurrency.Trx,
        amount: new Decimal(transferContract.parameter.value.amount).div(
          10 ** TRX_DECIMALS,
        ),

        senderAddress: TronWeb.address.fromHex(
          transferContract.parameter.value.owner_address,
        ),
        receiverAddress: TronWeb.address.fromHex(
          transferContract.parameter.value.to_address,
        ),

        blockNumber: formatTimestamp(tx.block_timestamp),
        blockTimestamp: formatTimestamp(tx.block_timestamp),
        transactionSignature: tx.txID,

        raw: tx,
      };
    });

    const usdtTransferJobs = await this._getUsdtTransactions(params);
    // TODO we ignore usdc as tron does not have it
    // const usdcTransferJobs = await this._getUsdcTransactions(params);

    return [...trxTransferJobs, ...usdtTransferJobs];
  }

  /**
   * Fetch TRX transactions for a specific wallet.
   * @param params.address The wallet address to fetch the transactions for
   * @returns TRX transactions of the wallet.
   */
  private async _getUsdtTransactions(params: {
    address: string;
  }): Promise<TransferJob[]> {
    const usdtTransactionsResponse = await fetch(
      `${this._tronApiUrl}/v1/accounts/${params.address}/transactions/trc20?limit=${TX_LIMIT}&only_to=${true}&contract_address=${this._usdtContractAddress}`,
      {
        headers: {
          'TRON-PRO-API-KEY': this._tronApiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    const usdtTransactions: UsdtTransactionsResponse =
      await usdtTransactionsResponse.json();

    const filteredUsdtTransactions = usdtTransactions.data.filter(
      (tx) =>
        tx.type === TRX_TYPE &&
        tx.token_info.address === this._usdtContractAddress,
    );

    return filteredUsdtTransactions.map((tx) => {
      return {
        currency: DepositTransactionCurrency.Usdt,
        amount: new Decimal(tx.value).div(10 ** TRX_USDT_DECIMALS),

        senderAddress: TronWeb.address.fromHex(tx.from),
        receiverAddress: TronWeb.address.fromHex(tx.to),

        blockNumber: formatTimestamp(tx.block_timestamp),
        blockTimestamp: formatTimestamp(tx.block_timestamp),
        transactionSignature: tx.transaction_id,

        raw: tx,
      };
    });
  }

  /**
   * Fetch USDC transactions for a specific wallet.
   * @param params.address The wallet address to fetch the transactions for
   * @returns USDC transactions of the wallet.
   */
  private async _getUsdcTransactions(params: {
    address: string;
  }): Promise<TransferJob[]> {
    const usdtTransactionsResponse = await fetch(
      `${this._tronApiUrl}/v1/accounts/${params.address}/transactions/trc20?limit=${TX_LIMIT}&only_to=${true}&contract_address=${this._usdcContractAddress}`,
      {
        headers: {
          'TRON-PRO-API-KEY': this._tronApiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    const usdtTransactions: UsdtTransactionsResponse =
      await usdtTransactionsResponse.json();

    const filteredUsdtTransactions = usdtTransactions.data.filter(
      (tx) =>
        tx.type === TRX_TYPE &&
        tx.token_info.address === this._usdcContractAddress,
    );

    return filteredUsdtTransactions.map((tx) => {
      return {
        currency: DepositTransactionCurrency.Usdc,
        amount: new Decimal(tx.value).div(10 ** TRX_USDC_DECIMALS),

        senderAddress: TronWeb.address.fromHex(tx.from),
        receiverAddress: TronWeb.address.fromHex(tx.to),

        blockNumber: formatTimestamp(tx.block_timestamp),
        blockTimestamp: formatTimestamp(tx.block_timestamp),
        transactionSignature: tx.transaction_id,

        raw: tx,
      };
    });
  }

  /**
   * Fetch new TRX transactions for a specific wallet. It uses the methods from
   * ILastNonceProvider to know what was the blockId of the last fetched tx.
   * @param params.address The wallet address to fetch the transactions for
   * @returns Newest TRX transactions of the wallet.
   */
  public async getLatestTransactionsOfAddress(params: {
    address: string;
  }): Promise<TransferJob[]> {
    const transactions = await this._getAddressTransactions(params);
    const lastBlockTimestamp =
      await this._lastNonceProvider.getLastBlockTimestamp();
    let newGreatestBlockNumber = lastBlockTimestamp;

    const newTransactions: TransferJob[] = [];

    // Process tx's. Ignore those that are in a block older that the last block number.

    for (const tx of transactions) {
      if (tx.blockTimestamp <= lastBlockTimestamp) continue;

      if (tx.blockTimestamp > newGreatestBlockNumber) {
        newGreatestBlockNumber = tx.blockTimestamp;
      }

      newTransactions.push(tx);
    }

    await this._lastNonceProvider.setLastBlockTimestamp(newGreatestBlockNumber);

    return newTransactions;
  }
}

export type TronTreasuryServiceConstructorParams = {
  tronApiKey: string;
  tronApiUrl: string;
  tronPrivateKey: string;
  tokenContractAddress: string;
};

@Injectable()
export class TronTreasuryService implements OnModuleInit {
  private _tronWeb: TronWeb;
  private _signerTronWeb: TronWeb;
  private _usdcContractAddress: string;
  private _usdtContractAddress: string;
  private _logger = new Logger(TronTreasuryService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const withdrawPrivateKey = await this.secretsService.getSecret(
      TRON_WITHDRAW_PRIVATE_KEY_SECRET,
    );

    if (!withdrawPrivateKey) {
      this._logger.error("Can't find the withdraw private key");
    }

    this._tronWeb = new TronWeb({
      fullHost: this.configService.getOrThrow<string>(ENV.TRON_HOST_URL),
      headers: {
        'TRON-PRO-API-KEY': this.configService.getOrThrow<string>(
          ENV.TRON_API_KEY,
        ),
      } as any,
      privateKey: withdrawPrivateKey,
    });

    this._signerTronWeb = new TronWeb(
      this.configService.getOrThrow<string>(ENV.TRON_HOST_URL),
      this.configService.getOrThrow<string>(ENV.TRON_HOST_URL),
      this.configService.getOrThrow<string>(ENV.TRON_HOST_URL),
      withdrawPrivateKey,
    );

    this._usdtContractAddress = this.configService.getOrThrow<string>(
      ENV.TRON_USDT_CONTRACT_ADDRESS,
    );

    this._usdcContractAddress = this.configService.getOrThrow<string>(
      ENV.TRON_USDC_CONTRACT_ADDRESS,
    );
  }

  public async sendTrx(params: {
    to: string;
    amount: number;
  }): Promise<string> {
    const tx = await this._tronWeb.trx.sendTrx(
      params.to,
      parseFloat(
        ethers.parseUnits(`${params.amount}`, TRX_DECIMALS).toString(),
      ),
    );

    return tx.transaction.txID;
  }

  // Send a token to a specific address
  // @param params.amount The parameters to send the value in the token without decimals
  public async sendToken(params: {
    to: string;
    amount: Decimal;
    type: 'USDT' | 'USDC';
  }): Promise<string> {
    const contract = await this._signerTronWeb
      .contract()
      .at(this.getTokenContractAddress(params.type));
    const parsedAmount = ethers
      .parseUnits(`${params.amount.toFixed(4)}`, TRX_DECIMALS)
      .toString();
    return await (contract as any).transfer(params.to, parsedAmount).send({
      feeLimit: 100_000_000,
      callValue: 0,
      shouldPollResponse: false,
    });
  }

  async getUsdtBalance(address: string): Promise<string | BigNumber> {
    const contract = await this._tronWeb.contract().at(this._usdtContractAddress);

    const balanceInSun = await contract.balanceOf(address).call();

    return this._tronWeb.fromSun(balanceInSun);
  }

  async getUsdcBalance(address: string): Promise<string | BigNumber> {
    const contract = await this._tronWeb.contract().at(this._usdcContractAddress);

    const balanceInSun = await contract.balanceOf(address).call();

    return this._tronWeb.fromSun(balanceInSun);
  }

  async getTrxBalance(address: string): Promise<string | BigNumber> {
    const balanceInSun = await this._tronWeb.trx.getBalance(address);

    return this._tronWeb.fromSun(balanceInSun);
  }

  private getTokenContractAddress(type: 'USDT' | 'USDC'): string {
    if (type === 'USDT') {
      return this._usdtContractAddress;
    }

    if (type === 'USDC') {
      return this._usdcContractAddress;
    }

    throw new Error('Invalid token type');
  }
}
