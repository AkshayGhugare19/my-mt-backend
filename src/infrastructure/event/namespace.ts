export const EventNamespace = {
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_DEPOSIT: 'transaction.user-deposit',
  USER_WITHDRAWAL: 'transaction.user-withdrawal',
  USER_RESTORE_TOKENS: 'transaction.user-restore-tokens',
  MASTER_TOKEN_ISSUE: 'transaction.master-token-issue',
  MASTER_TOKEN_ISSUE_LOCK: 'transaction.master-token-issue-lock',
  MASTER_TOKEN_ISSUE_RESTORE: 'transaction.master-token-issue-restore',
  MASTER_TOKEN_SETTLEMENT_RESTORE:
    'transaction.master-token-settlement-restore',
  MASTER_TOKEN_SETTLEMENT: 'transaction.master-token-settlement',

  USER_BALANCE_ADJUSTMENT: 'transaction.user-balance-adjustment',

  BONUS_BALANCE_UPDATE: 'transaction.bonus-balance-update',

  BET_PLACED: 'bet.bet-placed',
  BET_SETTLED: 'bet.bet-settled',
  BET_TRANSACTION: 'bet-transaction',
  BET_ROLLBACK: 'bet.bet-rollback',

  TRANSACTION_LEDGER_ENTRY_CREATED: 'transaction-ledger-entry.created',

  USER_REGISTER: 'user.register',
  USER_ACTIVATION_ACCOUNT: 'user.activation-account',

  EVENBET_DEBIT: 'evenbet.debit',
  EVENBET_CREDIT: 'evenbet.credit',
  EVENBET_ROLLBACK: 'evenbet.rollback',
} as const;
