import { User, WithdrawalRequest, Role as PrismaRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type WithdrawalRequestWithUser = WithdrawalRequest & {
  user: User & { roles: PrismaRole[] };
  firstApproverEmail: string | null;
  firstApproverNickname: string | null;
  secondApproverEmail: string | null;
  secondApproverNickname: string | null;
};

export type WithdrawalJobData = {
  userId: string;
  amount: number;
  pointsAmount: Decimal;
  currency: number;
  blockchain: number;
  withdrawalRequestId: string;
  withPriorityFee?: {
    solUsdPrice: number;
    priorityType: 'median' | 'max';
  };
};

export type WithdrawalsReportFilters = {
  search: string | undefined;
  date: [Date, Date] | undefined;
  amount: [number, number] | undefined;
  includePending: boolean | undefined;
};

export type BonusWithdrawal = {
  amount: Decimal;
  progressionId: string;
  balanceExpirationDate: Date;
}

export type WithdrawalRequestMetadata = {
  bonus: BonusWithdrawal[]
};
