export const TokenSettlementTypes = {
  VIP: 'VIP',
  MASTER: 'MASTER',
} as const;

export type TokenSettlementType =
  (typeof TokenSettlementTypes)[keyof typeof TokenSettlementTypes];
