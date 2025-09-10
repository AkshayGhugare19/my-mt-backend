export type ParsedBetInfo = {
  sportId: string | null;
  providerId: string | null;
  provider: string | null;
  category: string | null;
  gameId: string | null;
  minOdds: number | null;
  maxOdds: number | null;
  isRollback: boolean | null;
};
