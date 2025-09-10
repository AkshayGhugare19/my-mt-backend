import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { WithdrawalsExportData } from '@modules/withdrawal/repository/types';
import { WithdrawalsReportFilters } from '@modules/withdrawal/types';
import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
/* eslint-disable sonarjs/no-duplicate-string */

@Injectable()
export class WithdrawalRepository {
  constructor(private readonly prismaService: PrismaService) {}

  getWithdrawalsExportDataQuery(
    filters: WithdrawalsReportFilters,
    pagination: {
    page: number;
    limit: number;
  }): Promise<WithdrawalsExportData[]> {
    let qb = this.prismaService.createQueryBuilder()
      .selectFrom('transactions_ledger as tl')
      .innerJoin('users as u', 'tl.user_id', 'u.id')
      .innerJoin('withdrawal_requests as wr', 'wr.id', 'tl.reference_id')
      .distinctOn('wr.id')
      .select('wr.id as id')
      .select('u.player_tag as playerTag')
      .select('u.wallet as wallet')
      .select(s => {
        return s.case()
          .when('wr.blockchain', '=', 0).then('tron')
          .when('wr.blockchain', '=', 1).then('solana')
          .when('wr.blockchain', '=', 2).then('ethereum')
          .else('unknown')
          .end()
          .as('blockchain');
      })
      .select(s => {
        return s.case()
          .when('wr.currency', '=', 0).then('usdt')
          .when('wr.currency', '=', 1).then('solana')
          .when('wr.currency', '=', 2).then('ethereum')
          .when('wr.currency', '=', 3).then('trx')
          .when('wr.currency', '=', 4).then('usdc')
          .else('unknown')
          .end()
          .as('currency');
      })
      .select('wr.amount as amount')
      .select('wr.usd_amount as usdAmount')
      .select('tl.created_at as createdAt')
      .select('wr.status as status')
      .select('wr.target_wallet as targetWallet')
      .where('wr.status', '<>', 'FAILED');

    if (filters.search) {
      qb = qb.where(eb => eb.or([
        eb('u.nickname', 'ilike', `%${filters.search}%`),
        eb('u.wallet', 'ilike', `%${filters.search}%`),
        eb('u.id', 'ilike', `%${filters.search}%`),
        eb('u.player_tag', 'ilike', `%${filters.search}%`),
      ]));
    }

    if (filters.date) {
      const [start, end] = filters.date;
      qb = qb.where(w => w.between('tl.created_at', start, end));
    }
    if (filters.amount) {
      const [min, max] = filters.amount;
      qb = qb.where(w => w.between('tl.amount', new Decimal(min), new Decimal(max)));
    }
    if (!filters.includePending) {
      qb = qb.where('wr.status', 'in', ['ACCEPTED', 'AUTO_ACCEPTED', 'FAILED', 'FULFILLED', 'REJECTED']);
    }
    const query = qb
      .orderBy('wr.id', 'desc')
      .orderBy('wr.created_at', 'desc')
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit)
      .compile();

    return this.prismaService.runQuery(query);
  }
}
