import { ENV } from '@common/env';
import { Blockchain } from '@infrastructure/database/prisma/constants';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import {
  ETHEREUM_DEPOSIT_PUBLIC_KEY_SECRET,
  SOLANA_DEPOSIT_PUBLIC_KEY_SECRET,
  TRON_DEPOSIT_PUBLIC_KEY_SECRET,
} from '@infrastructure/secrets/config';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { DepositRepository } from '@modules/deposits/repository/deposit.repository';
import { DepositsExportData } from '@modules/deposits/repository/types';
import {
  DepositsReportFilters,
  PrismaDeposit,
  PrismaDepositWithUserDetails,
} from '@modules/deposits/types';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepositService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly secretsService: SecretsService,
    private readonly configService: ConfigService,
    private readonly depositRepository: DepositRepository,
  ) {}

  async getUserDeposits(
    id: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: PrismaDeposit[]; count: number }> {
    const [count] = await this.prismaService.$queryRaw<
      {
        count: number;
      }[]
    >(Prisma.sql`SELECT
        COUNT(transaction_ledger.id)
        from transactions_ledger transaction_ledger
        JOIN deposit_transactions deposit_transaction
        ON transaction_ledger.reference_id = deposit_transaction.id
          where transaction_ledger.user_id = ${id} 
          and transaction_ledger.operation_type = ${TransactionOperationTypes.CREDIT}
          and transaction_ledger.counter_party = ${TransactionCounterParties.DEPOSIT_SERVICE}
        `);
    const records = await this.prismaService.$queryRaw<
      PrismaDeposit[]
    >(Prisma.sql`SELECT 
        transaction_ledger.id, 
        transaction_ledger.operation_type, 
        transaction_ledger.amount, 
        transaction_ledger.status, 
        transaction_ledger.created_at, 
        deposit_transaction.transaction_id, 
        deposit_transaction.status,
        deposit_transaction.currency as currency,
        deposit_transaction.blockchain as blockchain,
        deposit_transaction.usd_amount as usd_amount,
        deposit_transaction.amount as crypto_amount
      from transactions_ledger transaction_ledger
      JOIN deposit_transactions deposit_transaction
      ON transaction_ledger.reference_id = deposit_transaction.id
        where transaction_ledger.user_id = ${id} 
        and transaction_ledger.operation_type = ${TransactionOperationTypes.CREDIT}
        and transaction_ledger.counter_party = ${TransactionCounterParties.DEPOSIT_SERVICE}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${(page - 1) * limit};
        `);
    return { data: records, count: Number(count.count) };
  }

  public async getDepositsExport(
    filters: DepositsReportFilters,
    pagination: {
      page: number;
      limit: number;
    },
  ): Promise<DepositsExportData[]> {
    return this.depositRepository.getDepositsExportDataQuery(filters, pagination);
  }

  async getDeposits(
    filter: DepositsReportFilters,
    page = 1,
    limit = 10,
  ): Promise<{ data: PrismaDepositWithUserDetails[]; count: number }> {
    function wrapForLike(value: string): string {
      return `%${value}%`;
    }

    const search = filter.search
      ? Prisma.sql`AND (u.email ILIKE ${wrapForLike(filter.search)} OR u.nickname ILIKE ${wrapForLike(filter.search)} OR u.wallet ILIKE ${wrapForLike(filter.search)} OR u.id ILIKE ${wrapForLike(filter.search)} OR u.player_tag ILIKE ${wrapForLike(filter.search)})`
      : Prisma.sql``;
    const interval = filter.interval
      ? Prisma.sql`AND transaction_ledger.created_at BETWEEN ${filter.interval[0]} AND ${filter.interval[1]}`
      : Prisma.sql``;
    const amount = filter.amount
      ? Prisma.sql`AND transaction_ledger.amount BETWEEN ${filter.amount[0]} AND ${filter.amount[1]}`
      : Prisma.sql``;

    const [count] = await this.prismaService.$queryRaw<
      {
        count: number;
      }[]
    >(Prisma.sql`SELECT
        COUNT(transaction_ledger.id)
        from transactions_ledger transaction_ledger
        JOIN deposit_transactions deposit_transaction
        ON transaction_ledger.reference_id = deposit_transaction.id
        JOIN users u
        ON transaction_ledger.user_id = u.id
          where transaction_ledger.operation_type = ${TransactionOperationTypes.CREDIT}
          and transaction_ledger.counter_party = ${TransactionCounterParties.DEPOSIT_SERVICE}
          ${search} ${amount} ${interval}
        `);
    const records = await this.prismaService.$queryRaw<
      PrismaDepositWithUserDetails[]
    >(Prisma.sql`SELECT 
        transaction_ledger.id, 
        transaction_ledger.operation_type, 
        transaction_ledger.amount, 
        transaction_ledger.status, 
        transaction_ledger.created_at, 
        deposit_transaction.transaction_id, 
        deposit_transaction.status,
        u.id as user_id,
        u.email as user_email,
        u.nickname as user_nickname,
        u.wallet as user_wallet,
        deposit_transaction.currency as currency,
        deposit_transaction.blockchain as blockchain,
        deposit_transaction.usd_amount as usd_amount,
        deposit_transaction.amount as crypto_amount
      from transactions_ledger transaction_ledger
      JOIN deposit_transactions deposit_transaction
      ON transaction_ledger.reference_id = deposit_transaction.id
      JOIN users u
      ON transaction_ledger.user_id = u.id
        where transaction_ledger.operation_type = ${TransactionOperationTypes.CREDIT}
        and transaction_ledger.counter_party = ${TransactionCounterParties.DEPOSIT_SERVICE}
        ${search} ${amount} ${interval}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${(page - 1) * limit};
        `);
    return { data: records, count: Number(count.count) };
  }

  async getDetails(): Promise<{
    [x: number]:
      |[{
          depositAddress: string;
          usdtMint: string;
        },
       {
          depositAddress: string;
          usdcMint: string;
        }]
      | undefined;
  }> {
    const [tronDepositAddress, solanaDepositAddress, ethereumDepositAddress] =
      await Promise.allSettled([
        this.secretsService.getSecret(TRON_DEPOSIT_PUBLIC_KEY_SECRET),
        this.secretsService.getSecret(SOLANA_DEPOSIT_PUBLIC_KEY_SECRET),
        this.secretsService.getSecret(ETHEREUM_DEPOSIT_PUBLIC_KEY_SECRET),
      ]);

    return {
      [Blockchain.Tron]:
        tronDepositAddress.status === 'fulfilled' && tronDepositAddress.value
          ? [{
              depositAddress: tronDepositAddress.value,
              usdtMint: this.configService.getOrThrow<string>(
                ENV.TRON_USDT_CONTRACT_ADDRESS,
              ),
            }, {
              depositAddress: tronDepositAddress.value,
              usdcMint: this.configService.getOrThrow<string>(
                ENV.TRON_USDC_CONTRACT_ADDRESS,
              ),
            }]
          : undefined,
      [Blockchain.Solana]:
        solanaDepositAddress.status === 'fulfilled' &&
        solanaDepositAddress.value
          ? [{
              depositAddress: solanaDepositAddress.value,
              usdtMint: this.configService.getOrThrow<string>(
                ENV.SOLANA_USDT_CONTRACT_ADDRESS,
              ),
            }, {
              depositAddress: solanaDepositAddress.value,
              usdcMint: this.configService.getOrThrow<string>(
                ENV.SOLANA_USDC_CONTRACT_ADDRESS,
              ),
            }]
          : undefined,
      [Blockchain.Ethereum]:
        ethereumDepositAddress.status === 'fulfilled' &&
        ethereumDepositAddress.value
          ? [{
              depositAddress: ethereumDepositAddress.value,
              usdtMint: this.configService.getOrThrow<string>(
                ENV.ETHEREUM_USDT_CONTRACT_ADDRESS,
              ),
            }, {
              depositAddress: ethereumDepositAddress.value,
              usdcMint: this.configService.getOrThrow<string>(
                ENV.ETHEREUM_USDC_CONTRACT_ADDRESS,
              ),
            }]
          : undefined,
    };
  }

  async userHasFirstTimeDeposit(userId: string): Promise<boolean> {
    const deposits = await this.prismaService.transaction.findFirst({
      where: {
        userId,
        operationType: TransactionOperationTypes.CREDIT,
        counterParty: TransactionCounterParties.DEPOSIT_SERVICE,
      },
      take: 1,
    });
    return !!deposits;
  }
}
