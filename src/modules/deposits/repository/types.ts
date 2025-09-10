import { Decimal } from '@prisma/client/runtime/library';

export type DepositsExportData = {
  playerTag: string | null;
  wallet: string | null;
  blockchain: string;
  playerRegisteredAt: Date;
  currency: string;
  usdAmount: Decimal | null;
  amount: Decimal | null;
  createdAt: Date;
  walletFrom: string;
  walletTo: string;
};
