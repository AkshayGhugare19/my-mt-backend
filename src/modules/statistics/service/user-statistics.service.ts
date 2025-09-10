import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GetTransactionHistoryDto } from '../dtos/get-transaction-history.dto';
import { PagePaginationResponse } from '@common/types';
import { TransactionsHistoryCounterParties } from '../enum/statistics-transaction.enum';
import { BetReportsService } from '@modules/bet/service/bet-reports.service';
import {
  UserBets,
  UserDeposit,
  UserPoker,
} from '../dtos/user-transactions.dto';
import { EvenBetService } from '@modules/betting-providers/evenbet/service/evenbet.service';
import { decimalToNumber } from '@utils/decimal-do-number';
import { TransactionOperationType } from '@modules/transaction-ledger/enum/type.enum';

@Injectable()
export class UserStatisticsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly betReportsService: BetReportsService,
    private readonly evenbetService: EvenBetService,
  ) {}

  async getTransactionHistory(
    userId: string,
    params: GetTransactionHistoryDto,
  ): Promise<PagePaginationResponse<UserDeposit | UserBets | UserPoker>> {
    let data;
    if (
      params.type === TransactionsHistoryCounterParties.DEPOSIT_SERVICE ||
      params.type === TransactionsHistoryCounterParties.WITHDRAWAL_SERVICE
    ) {
      const response: PagePaginationResponse<UserDeposit> =
        await this.getDepositWithdrawalHistory(userId, params);
      response.data = response.data.map((item) => {
        return {
          ...item,
          amount: item.amount * 100,
        };
      });
      data = response;
    } else if (
      params.type === TransactionsHistoryCounterParties.SLOTEGRATOR_GAMES
    ) {
      const bets = await this.betReportsService.getUserGamesBets(
        userId,
        params.page,
        params.limit,
        params.startDate,
        params.endDate,
      );

      const items = bets.data.map((item) => {
        return {
          date: item.date,
          bet: item.amount,
          game: item.game,
          settlement: item.settlement,
          status: item.status,
          type: 'bet' as 'bet',
        };
      });

      data = {
        data: items,
        limit: params.limit,
        page: params.page,
        total: bets.count,
      };
    } else if (
      params.type === TransactionsHistoryCounterParties.EVENBET_POKER
    ) {
      const items = await this.evenbetService.getMyInfo(
        { limit: params.limit, page: params.page },
        userId,
        params.startDate,
        params.endDate,
      );
      const array: UserPoker[] = items.data.map((item) => ({
        operationType: item.operationType as TransactionOperationType,
        amount: decimalToNumber(item.amount),
        status: item.status,
        createdAt: item.createdAt,
        type: 'poker',
      }));

      data = {
        data: array,
        limit: params.limit,
        page: params.page,
        total: items.total,
      };
    } else {
      Logger.error(
        `Received type ${params.type}. Expect one of DEPOSIT_SERVICE, WITHDRAWAL_SERVICE, SLOTEGRATOR_GAMES, EVENBET_POKER`,
        'UserStatisticsService.getTransactionHistory',
      );
      throw new InternalServerErrorException();
    }

    return data;
  }

  async getDepositWithdrawalHistory(
    userId: string,
    params: GetTransactionHistoryDto,
  ): Promise<PagePaginationResponse<UserDeposit>> {
    const { type, status, startDate, endDate, page = 1, limit = 10 } = params;
    const additionalCondition = type
      ? Prisma.sql`t.counter_party = ${type}`
      : Prisma.sql`1 = 1`;

    const statusCondition = status
      ? Prisma.sql`t.status = ${status}`
      : Prisma.sql`1 = 1`;

    const dateCondition =
      startDate && endDate
        ? Prisma.sql`t.created_at BETWEEN ${startDate}::timestamp AND ${endDate}::timestamp`
        : Prisma.sql`1 = 1`;
    // Count query
    const [count] = await this.prismaService.$queryRaw<
      { count: number }[]
    >(Prisma.sql`
      SELECT 
        COUNT(t.id) AS count
      FROM 
        transactions_ledger t
        LEFT JOIN deposit_transactions dt ON t.reference_id = dt.id
        LEFT JOIN withdrawal_requests wr ON t.reference_id = wr.id
      WHERE 
        t.user_id = ${userId}
        AND (${additionalCondition})
        AND (${statusCondition})
        AND (${dateCondition})
    `);

    // Records query
    const records = await this.prismaService.$queryRaw<
      {
        type: 'deposit';
        amount: Prisma.Decimal;
        operationType: string;
        counterParty: string;
        status: string;
        createdAt: Date;
        currency: string | null;
        quantity: Prisma.Decimal | null;
      }[]
    >(Prisma.sql`
      SELECT 
        t.operation_type AS "operationType",
        t.counter_party AS "counterParty",
        t.status, 
        t.created_at AS "createdAt",
        COALESCE(dt.usd_amount, wr.usd_amount) AS "amount", 
        COALESCE(dt.currency, wr.currency) AS "currency",
        COALESCE(dt.amount, wr.amount) AS "quantity"
      FROM 
        transactions_ledger t
        LEFT JOIN deposit_transactions dt ON t.reference_id = dt.id
        LEFT JOIN withdrawal_requests wr ON t.reference_id = wr.id
      WHERE 
        t.user_id = ${userId}
        AND (${additionalCondition})
        AND (${statusCondition})
        AND (${dateCondition})
      ORDER BY 
        t.created_at DESC
      LIMIT ${limit}
      OFFSET ${(page - 1) * limit};
    `);

    return {
      data: records.map((record) => ({
        ...record,
        type: 'deposit',
        amount: decimalToNumber(record.amount, 8),
        quantity: decimalToNumber(record.quantity, 8),
      })),
      total: Number(count.count),
      limit,
      page,
    };
  }
}
