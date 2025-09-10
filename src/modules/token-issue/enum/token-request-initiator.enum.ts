export const TokenRequestInitiators = {
  VIP: 'VIP',
  MASTER: 'MASTER',
  SUPER_MASTER: 'SUPER_MASTER',
};

export type TokenRequestInitiator =
  (typeof TokenRequestInitiators)[keyof typeof TokenRequestInitiators];
