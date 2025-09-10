export const TransactionsHistoryCounterParties = {
  DEPOSIT_SERVICE: 'DEPOSIT_SERVICE',
  SPORTSBOOK: 'SPORTSBOOK',
  FUNGAMESS: 'FUNGAMESS',
  WITHDRAWAL_SERVICE: 'WITHDRAWAL_SERVICE',
  EVENBET_POKER: 'EVENBET_POKER',
  SLOTEGRATOR_GAMES: 'SLOTEGRATOR_GAMES',
  SLOTEGRATOR_SPORTSBOOK: 'SLOTEGRATOR_SPORTSBOOK',
} as const;

export type TransactionsHistoryCounterParty =
  (typeof TransactionsHistoryCounterParties)[keyof typeof TransactionsHistoryCounterParties];
