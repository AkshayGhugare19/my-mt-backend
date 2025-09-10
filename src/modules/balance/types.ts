import { CreateBetPayload } from '@modules/bet/types';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { BetTransactionCounterParties } from '@modules/transaction-ledger/types';
import { Balance } from '@prisma/client';
import { Decimal, JsonValue } from '@prisma/client/runtime/library';

export type BalanceInfo = Pick<
  Balance,
  | 'balance'
  | 'debt'
  | 'biggestLoss'
  | 'biggestWin'
  | 'totalDeposit'
  | 'totalIssuedTo'
  | 'totalSettled'
  | 'totalLoss'
  | 'totalWin'
  | 'totalWithdraw'
  | 'volumePlayed'
>;

export type PlaceBet = {
  userId: string;
  referenceId: string;
  provider: BetTransactionCounterParties;
  betAmount: Decimal;
  balanceChange: Decimal; // This is the amount that the user bet, positive for bet, negative for refund
  bet: CreateBetPayload;
  metadata?: Record<string, any>;
};

type Provider =
  | typeof TransactionCounterParties.FUNGAMESS
  | typeof TransactionCounterParties.SPORTSBOOK
  | typeof TransactionCounterParties.SPORTS_EXCHANGE
  | typeof TransactionCounterParties.SLOTEGRATOR_GAMES
  | typeof TransactionCounterParties.SLOTEGRATOR_SPORTSBOOK;

export type CancelBet = {
  userId: string;
  betId: string;
  thirdPartyIdentifier: string;
  revertAmount: Decimal;
  provider: Provider;
  metadata?: Record<string, any>;
};

export type SettleBet = {
  userId: string;
  betId: string;
  provider: Provider;
  creditAmount: Decimal; // The amount to increment the balance by.
  betValue?: Decimal; // The amount that was bet.
  updateStatistics: boolean; // if true, total win/loss, biggest win/loss, etc. will be updated
  metadata?: Record<string, any>;
};

export type RefundBet = SettleBet & {
  thirdPartyIdentifier: string;
};

export type RollbackRefundBet = {
  userId: string;
  betId: string;
  thirdPartyIdentifier: string;
  creditAmount: Decimal;
  metadata?: JsonValue;
};

export type SettleAggregateBet = {
  userId: string;
  betId: string;
  provider: Provider;
  creditAmount: Decimal; // The amount to increment the balance by.
  aggregateBetValue: Decimal; // The amount that was bet.
  aggregateBetCredit: Decimal; // profit or loss (negative for loss)
};
