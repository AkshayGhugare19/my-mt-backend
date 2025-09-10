import { BetStatus } from '@modules/bet/enum/bet-status.enum';
import {
  TransactionCounterParties,
  TransactionCounterParty,
} from '@modules/transaction-ledger/enum/counter-party.enum';
import { TransactionStatus } from '@modules/transaction-ledger/enum/status.enum';
import {
  TransactionOperationType,
  TransactionOperationTypes,
} from '@modules/transaction-ledger/enum/type.enum';
import { TransactionTargetBalance } from '@modules/transaction-ledger/enum/target-balance.enum';
import { Transaction } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type CreateTransaction = {
  userId: string;
  amount: Decimal;
  operationType: TransactionOperationType;
  counterParty: TransactionCounterParty;
  referenceId: string;
  status: TransactionStatus;
  targetBalance?: TransactionTargetBalance;
};

export type CreateDepositTransaction = CreateTransaction & {
  operationType: typeof TransactionOperationTypes.CREDIT;
  counterParty: typeof TransactionCounterParties.DEPOSIT_SERVICE;
};

export type CreateWithdrawalTransaction = CreateTransaction & {
  operationType: typeof TransactionOperationTypes.DEBIT;
  counterParty: typeof TransactionCounterParties.WITHDRAWAL_SERVICE;
};

export type CreateRestoreTransaction = CreateTransaction & {
  operationType: typeof TransactionOperationTypes.RESTORE;
  counterParty: typeof TransactionCounterParties.WITHDRAWAL_SERVICE;
};

export type CreateBonusTransaction = {
  id: string;
  userId: string;
  amount: Decimal;
  status: TransactionStatus;
  operationType: typeof TransactionOperationTypes.DEBIT;
};

export type BetTransactionCounterParties =
  | typeof TransactionCounterParties.SPORTSBOOK
  | typeof TransactionCounterParties.SPORTS_EXCHANGE
  | typeof TransactionCounterParties.SLOTEGRATOR_GAMES
  | typeof TransactionCounterParties.SLOTEGRATOR_SPORTSBOOK;

export type CreateBetTransaction = CreateTransaction & {
  counterParty: BetTransactionCounterParties;
};

export type CreateMasterTokenIssueTransaction = CreateTransaction & {
  operationType: typeof TransactionOperationTypes.CREDIT;
  counterParty: typeof TransactionCounterParties.MASTER_TOKEN_ISSUE;
};

export type CreateBetSettlementTransaction = CreateTransaction & {
  operationType: typeof TransactionOperationTypes.CREDIT;
  counterParty: BetTransactionCounterParties;
  betValue: Decimal;
  betResult: Decimal; // profit or loss
  winLoss: BetStatus;
};

export type CreateBetCancelTransaction = CreateTransaction & {
  operationType: typeof TransactionOperationTypes.DEBIT;
  counterParty: BetTransactionCounterParties;
  betValue: Decimal;
  betResult: Decimal; // profit or loss
  winLoss: BetStatus;
};

export type CreateBetUpdateTransaction = CreateTransaction & {
  operationType:
    | typeof TransactionOperationTypes.CREDIT
    | typeof TransactionOperationTypes.DEBIT;
  counterParty: BetTransactionCounterParties;
  betValue: Decimal;
  winLoss: BetStatus;
  previousStatus: BetStatus;
};

export type BalanceAdjustmentWithUserDetails = Transaction & {
  user: {
    id: string;
    nickname?: string;
    email?: string;
  };
  master: {
    id: string;
    nickname?: string;
    email?: string;
  };
};
