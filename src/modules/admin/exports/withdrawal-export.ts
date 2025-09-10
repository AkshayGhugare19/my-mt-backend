import { WithdrawalsExportData } from '@modules/withdrawal/repository/types';
import { CellDef } from 'jspdf-autotable';
import { DateTime } from 'luxon';

export const WithdrawalsReportKeysMapper: Record<
  string,
  {
    cellDef?: CellDef & { valueFormatter?: (value: any) => string };
    name: string;
  }
> = {
  nickname: { name: 'nickname' },
  wallet: { name: 'wallet' },
  blockchain: { name: 'blockchain' },
  currency: { name: 'currency' },
  usdAmount: { name: 'usd_amount' },
  amount: { name: 'amount' },
  createdAt: {
    name: 'created_at',
    cellDef: {
      valueFormatter: (value) => DateTime.fromISO(value).toFormat('dd-MM-yyyy HH:mm:ss'),
    },
  },
  targetWallet: { name: 'target_wallet' },
  status: { name: 'status' }
} as const;

export abstract class WithdrawalExportMapper {
  static toItem(item: WithdrawalsExportData): Record<keyof typeof WithdrawalsReportKeysMapper, string> {
    return {
      playerTag: item.playerTag ?? '-',
      wallet: item.wallet ?? '-',
      blockchain: item.blockchain,
      currency: item.currency,
      amount: item.amount?.toString() ?? '-',
      usdAmount: item.usdAmount?.toString() ?? '-',
      createdAt: item.createdAt.toISOString(),
      targetWallet: item.targetWallet ?? '-',
      status: item.status ?? '-',
    };
  }
}
