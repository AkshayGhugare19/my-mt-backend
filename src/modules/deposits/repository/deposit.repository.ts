import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { DepositsExportData } from '@modules/deposits/repository/types';
import { DepositsReportFilters } from '@modules/deposits/types';
import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
/* eslint-disable sonarjs/no-duplicate-string */

@Injectable()
export class DepositRepository {
  constructor(private readonly prismaService: PrismaService) {}

  getDepositsExportDataQuery(
    filters: DepositsReportFilters,
    pagination: {
    page: number;
    limit: number;
  }): Promise<DepositsExportData[]> {
    let qb = this.prismaService.createQueryBuilder()
      .selectFrom('transactions_ledger as tl')
      .innerJoin('users as u', 'tl.user_id', 'u.id')
      .innerJoin('deposit_transactions as dt', 'dt.id', 'tl.reference_id')
      .select('tl.id as id')
      .select('u.player_tag as playerTag')
      .select('u.wallet as wallet')
      .select('u.created_at as playerRegisteredAt')
      .select(s => {
        return s.case()
          .when('dt.blockchain', '=', 0).then('tron')
          .when('dt.blockchain', '=', 1).then('solana')
          .when('dt.blockchain', '=', 2).then('ethereum')
          .else('unknown')
          .end()
          .as('blockchain');
      })
      .select(s => {
        return s.case()
          .when('dt.currency', '=', 0).then('usdt')
          .when('dt.currency', '=', 1).then('solana')
          .when('dt.currency', '=', 2).then('ethereum')
          .when('dt.currency', '=', 3).then('trx')
          .when('dt.currency', '=', 4).then('usdc')
          .else('unknown')
          .end()
          .as('currency');
      })
      .select('dt.amount as amount')
      .select('dt.usd_amount as usdAmount')
      .select('tl.created_at as createdAt')
      .select('dt.sender as walletFrom')
      .select('dt.receiver as walletTo');

    if (filters.search) {
      qb = qb.where(eb => eb.or([
        eb('u.email', 'ilike', `%${filters.search}%`),
        eb('u.nickname', 'ilike', `%${filters.search}%`),
        eb('u.wallet', 'ilike', `%${filters.search}%`),
        eb('u.id', 'ilike', `%${filters.search}%`),
        eb('u.player_tag', 'ilike', `%${filters.search}%`),
      ]));
    }

    if (filters.interval) {
      const [start, end] = filters.interval;
      qb = qb.where(w => w.between('tl.created_at', start, end));
    }
    if (filters.amount) {
      const [min, max] = filters.amount;
      qb = qb.where(w => w.between('tl.amount', new Decimal(min), new Decimal(max)));
    }
    const query = qb.orderBy('tl.created_at', 'desc')
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit)
      .compile();

    return this.prismaService.runQuery(query);
  }
}
