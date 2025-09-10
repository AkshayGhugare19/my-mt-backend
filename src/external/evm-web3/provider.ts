import { ENV } from '@common/env';
import { ETHEREUM_WITHDRAWAL_PRIVATE_KEY_SECRET } from '@infrastructure/secrets/config';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Web3, { Transaction } from 'web3';
import {
  ETHEREUM_USDT_DECIMALS,
  ETHEREUM_USDC_DECIMALS,
  TOKEN_BALANCE_ABI,
  TOKEN_TRANSFER_ABI,
} from './constants';

@Injectable()
export class EvmWeb3Provider {
  private connection;
  private _logger = new Logger(EvmWeb3Provider.name);
  private usdtContractAddress: string;
  private usdcContractAddress: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
  ) {
    this.connection = new Web3(
      this.configService.getOrThrow<string>(ENV.ETHEREUM_RPC_URL),
    );
    this.usdtContractAddress = this.configService.getOrThrow<string>(
      ENV.ETHEREUM_USDT_CONTRACT_ADDRESS,
    );
    this.usdcContractAddress = this.configService.getOrThrow<string>(
      ENV.ETHEREUM_USDC_CONTRACT_ADDRESS,
    );
  }

  async sendToken(amount: number, to: string, type: 'USDT' | 'USDC'): Promise<string | undefined> {
    try {
      const privateKey = await this.secretsService.getSecretOrFail(
        ETHEREUM_WITHDRAWAL_PRIVATE_KEY_SECRET,
      );

      const from = this.connection.eth.accounts.wallet.add(privateKey)[0];

      const gasPrice = await this.connection.eth.getGasPrice();

      const nonce = await this.connection.eth.getTransactionCount(from.address);

      const contractAddress = this.getContractAddress(type);
      const contract = new this.connection.eth.Contract(
        TOKEN_TRANSFER_ABI,
        contractAddress,
      );

      const data = contract.methods
        .transfer(to, amount * Math.pow(10, this.getDecimals(type)))
        .encodeABI();

      const tx: Transaction = {
        from: from.address,
        to: contractAddress,
        gasLimit: 100000,
        gasPrice,
        nonce,
        data,
      };

      const signedTx = await this.connection.eth.accounts.signTransaction(
        tx,
        privateKey,
      );

      const receipt = await this.connection.eth.sendSignedTransaction(
        signedTx.rawTransaction,
      );

      return receipt.transactionHash.toString();
    } catch (error) {
      this._logger.error(error);
      throw error;
    }
  }

  async sendEthereum(amount: number, to: string): Promise<string | undefined> {
    try {
      const privateKey = await this.secretsService.getSecretOrFail(
        ETHEREUM_WITHDRAWAL_PRIVATE_KEY_SECRET,
      );

      const from = this.connection.eth.accounts.wallet.add(privateKey)[0];

      const nonce = await this.connection.eth.getTransactionCount(from.address);

      const tx: Transaction = {
        from: from.address,
        to,
        value: this.connection.utils.toWei(amount, 'ether'),
        gas: 21000,
        gasPrice: await this.connection.eth.getGasPrice(),
        nonce,
      };

      const signedTx = await from.signTransaction(tx);

      const receipt = await this.connection.eth.sendSignedTransaction(
        signedTx.rawTransaction as string,
      );

      return receipt.transactionHash.toString();
    } catch (error) {
      this._logger.error(error);
      throw error;
    }
  }

  async getTokenBalance(address: string, type: 'USDT' | 'USDC'): Promise<string> {
    const contract = new this.connection.eth.Contract(
      TOKEN_BALANCE_ABI,
      this.getContractAddress(type),
    );

    const balance = (await contract.methods
      .balanceOf(address)
      .call()) as string;

    return this.connection.utils.fromWei(balance, 'mwei');
  }

  async getEthBalance(address: string): Promise<string> {
    const balanceInWei = await this.connection.eth.getBalance(address);

    return this.connection.utils.fromWei(balanceInWei, 'ether');
  }

  private getContractAddress(type: 'USDT' | 'USDC'): string {
    switch (type) {
      case 'USDT':
        return this.usdtContractAddress;
      case 'USDC':
        return this.usdcContractAddress;
      default:
        throw new Error('Invalid token type');
    }
  }

  private getDecimals(type: 'USDT' | 'USDC'): number {
    switch (type) {
      case 'USDT':
        return ETHEREUM_USDT_DECIMALS;
      case 'USDC':
        return ETHEREUM_USDC_DECIMALS;
      default:
        throw new Error('Invalid token type');
    }
  }
}
