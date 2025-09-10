/* eslint-disable curly */
/* eslint-disable sonarjs/prefer-single-boolean-return */
import { ENV } from '@common/env';
import { TransferJob } from '@infrastructure/cron-jobs/producer/types';
import { DepositTransactionCurrency } from '@infrastructure/database/prisma/constants';
import {
  SOLANA_WITHDRAWAL_PRIVATE_KEY_SECRET,
  SOLANA_DEPOSIT_PUBLIC_KEY_SECRET,
  SOLANA_FEES_PRIVATE_KEY_SECRET,
} from '@infrastructure/secrets/config';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import {
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import {
  Connection,
  ParsedTransactionWithMeta,
  PublicKey,
  ParsedAccountData,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction,
  TransactionExpiredBlockheightExceededError,
  TransactionExpiredNonceInvalidError,
  TransactionExpiredTimeoutError,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import bs58 from 'bs58';
import {
  SolanaLamportsTransferInstruction,
  SolanaLamportsTransferInstructionType,
  SolanaTokenIdempotentInstruction,
  SolanaTokenIdempotentInstructionType,
  SolanaTokenTransferInstruction,
  SolanaTokenTransferInstructionType,
} from './types';
import { SOLANA_USDT_DECIMALS, SOLANA_USDC_DECIMALS } from './constants';
import { RetryWithPriorityError } from '@external/solana-web3/errors/retry-with-priority.error';
import { getSimulationComputeUnits } from './utils';

@Injectable()
export class SolanaWeb3Provider {
  private connection;
  private usdtContractAddress: string;
  private usdcContractAddress: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
  ) {
    this.connection = new Connection(
      this.configService.getOrThrow<string>(ENV.SOLANA_RPC_URL),
    );
    this.usdtContractAddress = this.configService.getOrThrow<string>(
      ENV.SOLANA_USDT_CONTRACT_ADDRESS,
    );
    this.usdcContractAddress = this.configService.getOrThrow<string>(
      ENV.SOLANA_USDC_CONTRACT_ADDRESS,
    );
  }

  // #region TRANSACTIONS
  async getNumberDecimals(mintAddress: string): Promise<number> {
    const info = await this.connection.getParsedAccountInfo(
      new PublicKey(mintAddress),
    );

    return (info.value?.data as ParsedAccountData).parsed.info
      .decimals as number;
  }

  async sendToken(
    amount: Decimal,
    to: string,
    type: 'USDT' | 'USDC',
    withPriorityFee?: {
      solUsdPrice: number;
      priorityType: 'median' | 'max';
    },
  ): Promise<string> {
    const withdrawalAddress = await this.secretsService.getSecretOrFail(
      SOLANA_WITHDRAWAL_PRIVATE_KEY_SECRET,
    );

    const from = Keypair.fromSecretKey(bs58.decode(withdrawalAddress));

    const contractAddress = this.getContractAddress(type);

    const sourceAccount = await getAssociatedTokenAddress(
      new PublicKey(contractAddress),
      from.publicKey,
    );

    const destinationAccount = await getAssociatedTokenAddress(
      new PublicKey(contractAddress),
      new PublicKey(to),
    );

    let receiverAccountExists = false;
    try {
      // this will throw an error if the account doesn't exist
      await getAccount(this.connection, destinationAccount);
      receiverAccountExists = true;
    } catch (error) {
      // If the account doesn't exist, we'll add a create account instruction
      receiverAccountExists = false;
    }

    const instructions = [];

    // If receiver account doesn't exist, add instruction to create it
    if (!receiverAccountExists) {
      const createATAInstruction = createAssociatedTokenAccountIdempotentInstruction(
        from.publicKey, // payer
        destinationAccount, // associated token account address
        new PublicKey(to), // owner
        new PublicKey(this.getContractAddress(type)), // mint
      );
      instructions.push(createATAInstruction);
    }

    const numberDecimals = await this.getNumberDecimals(
      contractAddress,
    );

    instructions.push(
      createTransferInstruction(
        sourceAccount,
        destinationAccount,
        from.publicKey,
        amount.toNumber() * Math.pow(10, numberDecimals),
      ),
    );
    const tx = new Transaction();
    tx.add(
      ...instructions
    );

    if (withPriorityFee) {
      await this.addPriorityFeeToTokenTransfer(withPriorityFee, tx);
    }

    const latestBlockHash =
      await this.connection.getLatestBlockhash('finalized');

    tx.recentBlockhash = latestBlockHash.blockhash;

    try {
      return await sendAndConfirmTransaction(this.connection, tx, [from]);
    } catch (error) {
      const txSignature = (
        error as
          | TransactionExpiredBlockheightExceededError
          | TransactionExpiredTimeoutError
          | TransactionExpiredNonceInvalidError
      )?.signature;

      if (!txSignature) {
        if (
          error instanceof TransactionExpiredBlockheightExceededError ||
          error instanceof TransactionExpiredTimeoutError ||
          error instanceof TransactionExpiredNonceInvalidError
        ) {
          throw new RetryWithPriorityError(error);
        }
        throw error;
      }

      const txStatus = await this.connection.getTransaction(txSignature, {
        commitment: 'finalized',
        maxSupportedTransactionVersion: 0,
      });

      if (!txStatus) {
        throw error;
      }

      return txSignature;
    }
  }

  // #region SEND SPL TOKEN
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async sendLamports(
    amount: Decimal,
    to: string,
    withPriorityFee?: {
      solUsdPrice: number;
      // if the priority percentage is 'median', we use the median priority fee from the recent fees
      // if the priority percentage is 'max', we use the max priority fee relative to our max priority fee in usd
      priorityType: 'median' | 'max';
    },
  ): Promise<string> {
    const withdrawalAddress = await this.secretsService.getSecretOrFail(
      SOLANA_WITHDRAWAL_PRIVATE_KEY_SECRET,
    );

    const from = Keypair.fromSecretKey(bs58.decode(withdrawalAddress));

    const transaction = new Transaction();

    if (withPriorityFee) {
      // The compute units necessary for a transfer + setComputeUnitPrice and setComputeUnitLimit
      await this.addPriorityFeeToLamportsTransfer(withPriorityFee, transaction);
    }

    transaction.add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: new PublicKey(to),
        lamports: amount.toNumber() * LAMPORTS_PER_SOL,
      }),
    );

    const latestBlockHash =
      await this.connection.getLatestBlockhash('finalized');

    transaction.recentBlockhash = latestBlockHash.blockhash;
    try {
      return await sendAndConfirmTransaction(this.connection, transaction, [
        from,
      ]);
    } catch (error) {
      const txSignature = (
        error as
          | TransactionExpiredBlockheightExceededError
          | TransactionExpiredTimeoutError
          | TransactionExpiredNonceInvalidError
      )?.signature;

      if (!txSignature) {
        if (
          error instanceof TransactionExpiredBlockheightExceededError ||
          error instanceof TransactionExpiredTimeoutError ||
          error instanceof TransactionExpiredNonceInvalidError
        ) {
          throw new RetryWithPriorityError(error);
        }
        throw error;
      }

      const txStatus = await this.connection.getTransaction(txSignature, {
        commitment: 'finalized',
        maxSupportedTransactionVersion: 0,
      });

      if (!txStatus) {
        throw error;
      }

      return txSignature;
    }
  }

  private async addPriorityFeeToLamportsTransfer(
    withPriorityFee: {
      solUsdPrice: number;
      // if the priority percentage is 'median', we use the median priority fee from the recent fees
      // if the priority percentage is 'max', we use the max priority fee relative to our max priority fee in usd
      priorityType: 'median' | 'max';
    },
    transaction: Transaction,
  ): Promise<void> {
    const units = 450;
    const maxPriorityFee = await this.getMaxPriorityFee(
      withPriorityFee.solUsdPrice,
      units,
    );

    let priorityFee =
      withPriorityFee.priorityType === 'median'
        ? await this.getMedianPriorityFee()
        : maxPriorityFee;
    const minPriorityFee = 100;

    if (priorityFee < minPriorityFee) {
      priorityFee = minPriorityFee;
    }

    if (priorityFee > maxPriorityFee) {
      priorityFee = maxPriorityFee;
    }
    const computeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units,
    });

    // set the priority fee to the max priority fee price in sol
    const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: Math.floor(priorityFee),
    });

    transaction.add(computeUnits);
    transaction.add(priorityFeeInstruction);
  }

  private async addPriorityFeeToTokenTransfer(
    withPriorityFee: {
      solUsdPrice: number;
      // if the priority percentage is 'median', we use the median priority fee from the recent fees
      // if the priority percentage is 'max', we use the max priority fee relative to our max priority fee in usd
      priorityType: 'median' | 'max';
    },
    transaction: Transaction,
  ): Promise<void> {
    const withdrawalAddress = await this.secretsService.getSecretOrFail(
      SOLANA_WITHDRAWAL_PRIVATE_KEY_SECRET,
    );

    const from = Keypair.fromSecretKey(bs58.decode(withdrawalAddress));

    let units = await getSimulationComputeUnits(
      this.connection,
      transaction.instructions,
      from.publicKey,
      [],
    ).catch((error) => {
      Logger.error(
        {
          message: 'Failed to get compute units',
          error: error.message,
        },
        'SolanaWeb3Provider.addPriorityFeeToTokenTransfer',
      );
      return 0;
    });

    if (!units) {
      Logger.error(
        {
          message: 'Failed to get compute units',
          transaction: transaction.toString(),
          feePayer: transaction.feePayer?.toString(),
          instructions: transaction.instructions.map((i) => i.toString()),
          units,
        },
        'SolanaWeb3Provider.addPriorityFeeToTokenTransfer',
      );
      return;
    }

    // add 150 compute units for the priority fee
    units = units + 150;

    const maxPriorityFee = await this.getMaxPriorityFee(
      withPriorityFee.solUsdPrice,
      units,
    );

    let priorityFee =
      withPriorityFee.priorityType === 'median'
        ? await this.getMedianPriorityFee()
        : maxPriorityFee;
    const minPriorityFee = 100;

    if (priorityFee < minPriorityFee) {
      priorityFee = minPriorityFee;
    }

    if (priorityFee > maxPriorityFee) {
      priorityFee = maxPriorityFee;
    }
    const computeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units,
    });

    // set the priority fee to the max priority fee price in sol
    const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: Math.floor(priorityFee),
    });
    transaction.instructions.unshift(computeUnits);
    transaction.instructions.unshift(priorityFeeInstruction);
  }

  // #endregion

  async signTokenTransactionFeePayer(
    amount: number,
    sender: string,
    type: 'USDT' | 'USDC',
  ): Promise<VersionedTransaction> {
    const depositWalletPublicKey = await this.secretsService.getSecretOrFail(
      SOLANA_DEPOSIT_PUBLIC_KEY_SECRET,
    );

    const feePayerPrivateKey = await this.secretsService.getSecretOrFail(
      SOLANA_FEES_PRIVATE_KEY_SECRET,
    );

    const feePayerKeypair = Keypair.fromSecretKey(
      bs58.decode(feePayerPrivateKey),
    );

    const senderATA = await getAssociatedTokenAddress(
      new PublicKey(this.getContractAddress(type)),
      new PublicKey(sender),
    );

    const receiverATA = await getAssociatedTokenAddress(
      new PublicKey(this.getContractAddress(type)),
      new PublicKey(depositWalletPublicKey),
    );

    // Check if receiver's associated token account exists
    const instructions = [];

    // Try to get the receiver's token account info
    let receiverAccountExists = false;
    try {
      // this will throw an error if the account doesn't exist
      await getAccount(this.connection, receiverATA);
      receiverAccountExists = true;
    } catch (error) {
      // If the account doesn't exist, we'll add a create account instruction
      receiverAccountExists = false;
    }

    // If receiver account doesn't exist, add instruction to create it
    if (!receiverAccountExists) {
      const createATAInstruction = await createAssociatedTokenAccountIdempotentInstruction(
        feePayerKeypair.publicKey, // payer
        receiverATA, // associated token account address
        new PublicKey(depositWalletPublicKey), // owner
        new PublicKey(this.getContractAddress(type)), // mint
      );
      instructions.push(createATAInstruction);
    }

    // Add the transfer instruction
    const transferInstruction = createTransferInstruction(
      senderATA,
      receiverATA,
      new PublicKey(sender),
      amount * Math.pow(10, this.getDecimals(type)),
      [],
      TOKEN_PROGRAM_ID,
    );
    instructions.push(transferInstruction);

    const latestBlockHash =
      await this.connection.getLatestBlockhash('finalized');

    const message = new TransactionMessage({
      payerKey: feePayerKeypair.publicKey,
      recentBlockhash: latestBlockHash.blockhash,
      instructions,
    }).compileToV0Message();

    const versionedTransaction = new VersionedTransaction(message);

    versionedTransaction.sign([feePayerKeypair]);

    return versionedTransaction;
  }
  // #endregion

  /**
   * Get the median priority fee from the recent fees
   * @returns the median priority fee
   * this is expressed in micro lamports
   */
  private async getMedianPriorityFee(): Promise<number> {
    const prioFee = await this.connection.getRecentPrioritizationFees();

    if (prioFee.length === 0) return 0;

    const fees = prioFee
      .map((fee) => fee.prioritizationFee)
      .sort((a, b) => a - b);

    return fees[Math.floor(fees.length / 2)];
  }

  /**
   * Get the max priority fee from the recent fees
   * @returns the max priority fee
   * this is expressed in micro lamports
   * ! This is calculated for only one signature in the transaction
   */
  private async getMaxPriorityFee(
    solUsdPrice: number,
    transactionUnits: number,
  ): Promise<number> {
    // this is the fee in lamports for each signature. We have only one signature in the transaction
    const defaultSolanaFee = 5000;

    const maxPriorityFeeUsd = this.configService.getOrThrow<number>(
      ENV.SOLANA_MAX_PRIORITY_FEE_USD,
    );

    const maxPriorityFeeLamports = new Decimal(maxPriorityFeeUsd)
      .div(solUsdPrice)
      .mul(LAMPORTS_PER_SOL)
      .minus(defaultSolanaFee);
    const toMicroLamports = maxPriorityFeeLamports
      .mul(1_000_000)
      .div(transactionUnits)
      .toFixed(0);

    return Number(toMicroLamports);
  }

  // #region BALANCE
  async getTokenBalance(address: string, type: 'USDT' | 'USDC'): Promise<number | undefined> {
    const tokenAccounts = await this.connection.getTokenAccountsByOwner(
      new PublicKey(address),
      {
        programId: TOKEN_PROGRAM_ID,
      },
    );

    for (const tokenAccount of tokenAccounts.value) {
      const tokenAccountInfo = await getAccount(
        this.connection,
        new PublicKey(tokenAccount.pubkey),
      );

      if (
        tokenAccountInfo.mint.equals(new PublicKey(this.getContractAddress(type)))
      ) {
        return new Decimal(Number(tokenAccountInfo.amount)).div(10 ** this.getDecimals(type)).toNumber();
      }
    }
  }

  async getSolBalance(address: string): Promise<number> {
    return (
      (await this.connection.getBalance(new PublicKey(address))) /
      LAMPORTS_PER_SOL
    );
  }
  // #endregion

  // #region TOKEN
  async isTokenTransfer(
    transaction: ParsedTransactionWithMeta,
  ): Promise<boolean> {
    const idempotentInstruction =
      this.getTokenIdempotentInstruction(transaction);

    if (!idempotentInstruction) return false;

    const transferInstruction = this.getTokenTransferInstruction(transaction);

    if (!transferInstruction) return false;

    if (this.usdtContractAddress !== idempotentInstruction.parsed.info.mint || this.usdcContractAddress !== idempotentInstruction.parsed.info.mint)
      return false;

    const depositAddress = await this.secretsService.getSecretOrFail(
      SOLANA_DEPOSIT_PUBLIC_KEY_SECRET,
    );

    if (depositAddress !== idempotentInstruction.parsed.info.wallet)
      return false;

    return true;
  }

  getTokenIdempotentInstruction(
    transaction: ParsedTransactionWithMeta,
  ): SolanaTokenIdempotentInstructionType | undefined {
    for (const instruction of transaction.transaction.message.instructions) {
      const parsedInstruction =
        SolanaTokenIdempotentInstruction.safeParse(instruction);
      if (
        parsedInstruction.success &&
        parsedInstruction.data.parsed.type === 'createIdempotent'
      ) {
        return parsedInstruction.data;
      }
    }
  }

  getTokenTransferInstruction(
    transaction: ParsedTransactionWithMeta,
  ): SolanaTokenTransferInstructionType | undefined {
    for (const instruction of transaction.transaction.message.instructions) {
      const parsedInstruction =
        SolanaTokenTransferInstruction.safeParse(instruction);
      if (
        parsedInstruction.success &&
        parsedInstruction.data.parsed.type === 'transfer'
      ) {
        return parsedInstruction.data;
      }
    }
  }

  fromTokenTransferToJobData(
    transaction: ParsedTransactionWithMeta,
  ): TransferJob {
    const tokenIdempotentInstruction = this.getTokenIdempotentInstruction(
      transaction,
    ) as SolanaTokenIdempotentInstructionType;

    const tokenTransferInstruction = this.getTokenTransferInstruction(
      transaction,
    ) as SolanaTokenTransferInstructionType;
    const type = tokenIdempotentInstruction.parsed.info.mint === this.usdtContractAddress ? 'USDT' : tokenIdempotentInstruction.parsed.info.mint === this.usdcContractAddress ? 'USDC' : undefined;

    if (!type) throw new Error('Invalid token transfer instruction');

    return {
      currency: type === 'USDT' ? DepositTransactionCurrency.Usdt : DepositTransactionCurrency.Usdc,
      amount: new Decimal(tokenTransferInstruction.parsed.info.amount).div(
        10 ** this.getDecimals(type),
      ),

      senderAddress: tokenTransferInstruction.parsed.info.authority,
      receiverAddress: tokenIdempotentInstruction.parsed.info.wallet,

      blockNumber: Number(transaction?.blockTime),
      blockTimestamp: Number(transaction?.blockTime),
      transactionSignature: transaction.transaction.signatures[0],
      raw: {},
    };
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
        return SOLANA_USDT_DECIMALS;

      case 'USDC':
        return SOLANA_USDC_DECIMALS;

      default:
        throw new Error('Invalid token type');
    }
  }
  // #endregion

  // #region LAMPORTS
  async isLamportsTransfer(
    transaction: ParsedTransactionWithMeta,
  ): Promise<boolean> {
    const transferInstruction =
      this.getLamportsTransferInstruction(transaction);

    if (!transferInstruction) return false;

    const depositAddress = await this.secretsService.getSecretOrFail(
      SOLANA_DEPOSIT_PUBLIC_KEY_SECRET,
    );

    if (depositAddress !== transferInstruction.parsed.info.destination)
      return false;

    return true;
  }

  getLamportsTransferInstruction(
    transaction: ParsedTransactionWithMeta,
  ): SolanaLamportsTransferInstructionType | undefined {
    for (const instruction of transaction.transaction.message.instructions) {
      const parsedInstruction =
        SolanaLamportsTransferInstruction.safeParse(instruction);
      if (
        parsedInstruction.success &&
        parsedInstruction.data.parsed.type === 'transfer'
      ) {
        return parsedInstruction.data;
      }
    }
  }

  fromLamportsTransferToJobData(
    transaction: ParsedTransactionWithMeta,
  ): TransferJob {
    const lamportsTransferInstruction = this.getLamportsTransferInstruction(
      transaction,
    ) as SolanaLamportsTransferInstructionType;

    return {
      currency: DepositTransactionCurrency.Solana,
      amount: new Decimal(lamportsTransferInstruction.parsed.info.lamports).div(
        LAMPORTS_PER_SOL,
      ),

      senderAddress: lamportsTransferInstruction.parsed.info.source,
      receiverAddress: lamportsTransferInstruction.parsed.info.destination,

      blockNumber: Number(transaction?.blockTime),
      blockTimestamp: Number(transaction?.blockTime),
      transactionSignature: transaction.transaction.signatures[0],
      raw: {},
    };
  }
  // #endregion
}
