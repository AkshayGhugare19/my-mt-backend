import { DepositsExportData } from '@modules/deposits/repository/types';
import { CellDef } from 'jspdf-autotable';
import { DateTime } from 'luxon';

export const DepositsReportKeysMapper: Record<
string,
{
  cellDef?: CellDef & { valueFormatter?: (value: any) => string };
  name: string;
}
> = {
  nickname: { name: 'nickname' },
  playerRegisteredAt: {
    name: 'player_registered_at',
    cellDef: {
      valueFormatter: (value) =>
        DateTime.fromISO(value).toFormat('dd-MM-yyyy HH:mm:ss'),
      colSpan: 1,
      rowSpan: 2,
    },
  },
  wallet: { name: 'wallet' },
  blockchain: { name: 'blockchain' },
  currency: { name: 'currency' },
  amount: { name: 'usd_amount' },
  usdAmount: { name: 'usd_amount' },
  createdAt: {
    name: 'created_at',
    cellDef: {
      valueFormatter: (value) =>
        DateTime.fromISO(value).toFormat('dd-MM-yyyy HH:mm:ss'),
      colSpan: 1,
      rowSpan: 2,
    },
  },
  walletFrom: { name: 'wallet_from' },
  walletTo: { name: 'wallet_to' },
} as const;

export abstract class DepositExportMapper {
  static toItem(
    item: DepositsExportData,
  ): Record<keyof typeof DepositsReportKeysMapper, string> {
    return {
      playerTag: item.playerTag ?? '-',
      playerRegisteredAt: item.playerRegisteredAt.toISOString(),
      wallet: item.wallet ?? '-',
      blockchain: item.blockchain,
      currency: item.currency,
      amount: item.amount?.toString() ?? '-',
      usdAmount: item.usdAmount?.toString() ?? '-',
      createdAt: item.createdAt.toISOString(),
      walletFrom: item.walletFrom ?? '-',
      walletTo: item.walletTo ?? '-',
    };
  }
}
