export const BetProviders = {
  FUNGAMESS: 'FUNGAMESS',
  SPORTS_EXCHANGE: 'SPORTS_EXCHANGE',
  SLOTEGRATOR_GAMES: 'SLOTEGRATOR_GAMES',
  SLOTEGRATOR_SPORTSBOOK: 'SLOTEGRATOR_SPORTSBOOK',
} as const;

export type BetProvider = (typeof BetProviders)[keyof typeof BetProviders];
