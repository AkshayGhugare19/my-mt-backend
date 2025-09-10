import { TokenIssueRequest } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type TokenIssueRequestWithEmails = TokenIssueRequest & {
  targetEmail: string;
  targetNickname: string;
  masterEmail: string;
  masterNickname: string;
  userBookieStake?: number;
  predefinedBookieStake?: number;
  flexibleBookieStake?: number;
};

export type TokenIssuePrepaid = {
  prepaid?: number;
  paymentType?: 'cash' | 'usdt';
  proof?: string;
};

export type CreateMasterTokenIssue = {
  amount: Decimal;
} & TokenIssuePrepaid;

export type TokenIssueWithRequester = TokenIssueRequest & {
  requester: {
    email: string | null;
    nickname: string | null;
    userBookieStake?: Decimal | null;
    flexibleBookieStake?: Decimal | null;
    predefinedBookieStake?: Decimal | null;
  };
  master: { email: string | null; nickname: string | null };
}
