import { TransactionStatus } from '@modules/transaction-ledger/enum/status.enum';
import { TransactionOperationType } from '@modules/transaction-ledger/enum/type.enum';
import { Decimal } from '@prisma/client/runtime/library';

export type PrismaDeposit = {
  id: string;
  operation_type: TransactionOperationType;
  amount: Decimal;
  status: TransactionStatus;
  created_at: Date;
  transaction_id: string;
  currency: number;
  blockchain?: number;
  usd_amount?: number;
  crypto_amount: number;
};

export type PrismaDepositWithUserDetails = PrismaDeposit & {
  user_id: string;
  user_email?: string | null;
  user_nickname?: string | null;
  user_wallet?: string | null;
  currency?: number;
  blockchain?: number;
  usd_amount?: number;
  crypto_amount: number;
};

export type DepositsReportFilters = {
  search: string | undefined;
  interval: [Date, Date] | undefined;
  amount: [number, number] | undefined;
};
