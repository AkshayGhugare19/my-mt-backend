import {
  PrismaService,
  PrismaTransactionManager,
} from '@infrastructure/database/prisma/prisma.service';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { InjectQueue } from '@nestjs/bull';
import { BadRequestException, Injectable } from '@nestjs/common';
import { DepositTransaction, Prisma } from '@prisma/client';
import Bull, { Queue } from 'bull';
import {
  TransferJob,
  TronUSDTokenTransferJob,
} from '@infrastructure/cron-jobs/producer/types';
import { defaultJobConfig } from '@infrastructure/queue/bull/queue-config';
import { SolanaWeb3Provider } from '@external/solana-web3/provider';

@Injectable()
export class DepositTransactionService {
  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue(QueuesDefinition.DEPOSITS_QUEUE.name)
    private queue: Queue,
    private readonly solanaWeb3Provider: SolanaWeb3Provider,
  ) {}

  async create(
    createDto: Prisma.DepositTransactionCreateInput,
    transactionManager?: PrismaTransactionManager,
  ): Promise<DepositTransaction> {
    const client = this.getClient(transactionManager);
    return await client.depositTransaction.create({ data: createDto });
  }

  getClient(
    transactionManager?: PrismaTransactionManager,
  ): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }

  async enqueueTronTransferJob(
    data: TransferJob,
  ): Promise<Bull.Job<TransferJob>> {
    return await this.queue.add(JOB.TRON_TRANSFER, data, {
      ...defaultJobConfig,
    });
  }

  async enqueueSolanaTransferJob(
    data: TransferJob,
  ): Promise<Bull.Job<TransferJob>> {
    return await this.queue.add(JOB.SOLANA_TRANSFER, data, {
      ...defaultJobConfig,
    });
  }

  async enqueueEthereumTransferJob(
    data: TransferJob,
  ): Promise<Bull.Job<TransferJob>> {
    return await this.queue.add(JOB.ETHEREUM_TRANSFER, data, {
      ...defaultJobConfig,
    });
  }

  async enqueueTronUSDTokenTransferJob(
    data: TronUSDTokenTransferJob,
    delay?: number,
  ): Promise<Bull.Job<TronUSDTokenTransferJob>> {
    return await this.queue.add(
      JOB.TRON_TOKEN_TRANSFER,
      {
        ...data,
        tick: Date.now(),
      },
      {
        ...defaultJobConfig,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5_000, // wait at least 5 seconds before we retry
        },
        delay,
      },
    );
  }

  async solanaSignFeePayer(
    internalWalletPublicKey: string,
    amount: number,
    currency: 'USDC' | 'USDT',
  ): Promise<{
    signedTransaction: string;
  }> {
    const foundInternalWallet = await this.prismaService.depositWallet.findUnique({
      where: {
        wallet: internalWalletPublicKey,
      },
      select: {
        userId: true,
      },
    });

    if (!foundInternalWallet) {
      throw new BadRequestException('Invalid internal wallet');
    }

    const versionedTransaction =
      await this.solanaWeb3Provider.signTokenTransactionFeePayer(
        amount,
        internalWalletPublicKey,
        currency,
      );

    return {
      signedTransaction: Buffer.from(versionedTransaction.serialize()).toString(
        'base64',
      ),
    };
  }

  getExistingTransactions(fromBlock: number, toBlock: number, chain: number): Promise<{transactionId: string}[]> {
    return this.prismaService.depositTransaction.findMany({
      where: {
        blockNumber: {
          gte: fromBlock,
          lte: toBlock,
        },
        blockchain: chain,
      },
      select: {
        transactionId: true,
      },
    });
  }
}
