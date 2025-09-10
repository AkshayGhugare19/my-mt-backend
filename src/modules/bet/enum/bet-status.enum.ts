export const BetStatuses = {
  PENDING: 'PENDING',
  WIN: 'WIN',
  DEBIT: 'DEBIT',
  LOSS: 'LOSS',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  CASH_OUT: 'CASH_OUT',
  ABORT: 'ABORT',
} as const;

export type BetStatus = (typeof BetStatuses)[keyof typeof BetStatuses];
