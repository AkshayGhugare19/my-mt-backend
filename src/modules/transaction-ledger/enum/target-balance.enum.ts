export const TransactionTargetBalances = {
  ACCOUNT_BALANCE: 'account_balance',
  BONUS_BALANCE: 'bonus_balance',
};

export type TransactionTargetBalance =
  (typeof TransactionTargetBalances)[keyof typeof TransactionTargetBalances];
