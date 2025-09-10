import { BetReportItem } from '@modules/bet/types';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToDollarsValue } from '@utils/decimal-to-dollar-value';
import { CellDef } from 'jspdf-autotable';
import { DateTime } from 'luxon';

export const UserBetReportKeysMapper: Record<
  string,
  {
    cellDef?: CellDef & { valueFormatter?: (value: any) => string };
    name: string;
  }
> = {
  accountBalance: { name: 'Bet (Real)' },
  bonusBalance: { name: 'Bet (Bonus)' },
  status: { name: 'Status' },
  previousBalance: { name: 'Previous Balance' },
  settlements: { name: 'Settlements' },
  date: {
    name: 'Date',
    cellDef: {
      valueFormatter: (value) =>
        DateTime.fromISO(value).toFormat('dd-MM-yyyy HH:mm:ss'),
      colSpan: 1,
      styles: {
        fillColor: 'blue',
      },
    },
  },
  outcome: { name: 'Outcome' },
  category: { name: 'Category' },
  game: { name: 'Game' },
  betId: { name: 'Bet ID' },
  cashout: { name: 'Cashout' },
  roundId: { name: 'Round ID' },
  gameId: { name: 'Game ID' },
  casinoPlayerId: { name: 'Casino Player ID' },
  sessionId: { name: 'Session ID' },
} as const;

export abstract class BetExportMapper {
  static toBetReportItem(
    item: BetReportItem,
  ): Record<keyof typeof UserBetReportKeysMapper, string> {
    return {
      betId: item.bet.thirdPartyIdentifier,
      accountBalance: decimalToDollarsValue(
        item.targetBalance
          .filter((item) => item.balance === 'account_balance')
          .reduce(
            (prev, curr) => prev.plus(new Decimal(curr?.amount || 0)),
            new Decimal(0),
          ) || new Decimal(0),
      ).toString(),
      bonusBalance: decimalToDollarsValue(
        item.targetBalance
          .filter((item) => item.balance === 'bonus_balance')
          .reduce(
            (prev, curr) => prev.plus(new Decimal(curr?.amount || 0)),
            new Decimal(0),
          ) || new Decimal(0),
      ).toString(),
      settlements: (decimalToDollarsValue(item.settlement) || 0).toString(),
      previousBalance: (
        decimalToDollarsValue(item.previousBalance) || 0
      ).toString(),
      date: item.date,
      outcome: item.outcome,
      category: item.category,
      game: item.game,
      roundId: item.roundId ?? '',
      gameId: item.gameId ?? '',
      casinoPlayerId: item.casinoPlayerId ?? '',
      sessionId: item.sessionId ?? '',
      status: item.bet.status,
      cashout: (item.bet.metadata as Record<string, any>)?.settleBet?.extraData
        ?.is_cashout
        ? 'Yes'
        : 'No',
    };
  }
}
