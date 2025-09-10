import { Decimal } from '@prisma/client/runtime/library';

export type WithdrawalsExportData = {
  playerTag: string | null;
  wallet: string | null;
  blockchain: string;
  currency: string;
  amount: Decimal | null;
  usdAmount: Decimal | null;
  createdAt: Date;
  targetWallet: string;
  status: string;
};
