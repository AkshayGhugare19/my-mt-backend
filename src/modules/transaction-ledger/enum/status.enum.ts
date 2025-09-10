export const TransactionStatuses = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const;

export type TransactionStatus =
  (typeof TransactionStatuses)[keyof typeof TransactionStatuses];
