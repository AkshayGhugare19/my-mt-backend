import { z } from 'zod';

export const OverallGgrSchema = z.object({
  ggrToday: z.string(),
  ggrThisWeek: z.string(),
  ggrThisMonth: z.string(),
  ggrAllTime: z.string(),
});

export const NgrSchema = z.object({
  ngrToday: z.string(),
  ngrThisWeek: z.string(),
  ngrThisMonth: z.string(),
  ngrAllTime: z.string(),
});

export const SportExchangeGgrSchema = z.object({
  ggrSportExchangeToday: z.string(),
  ggrSportExchangeThisWeek: z.string(),
  ggrSportExchangeThisMonth: z.string(),
  ggrSportExchangeAllTime: z.string(),
});

export const SportBookGgrSchema = z.object({
  ggrSportBookToday: z.string(),
  ggrSportBookThisWeek: z.string(),
  ggrSportBookThisMonth: z.string(),
  ggrSportBookAllTime: z.string(),
});

export const GamesGgrSchema = z.object({
  ggrGamesToday: z.string(),
  ggrGamesThisWeek: z.string(),
  ggrGamesThisMonth: z.string(),
  ggrGamesAllTime: z.string(),
});

export const PokerGgrSchema = z.object({
  ggrPokerToday: z.string(),
  ggrPokerThisWeek: z.string(),
  ggrPokerThisMonth: z.string(),
  ggrPokerAllTime: z.string(),
});

export const GgrStatisticsSchema = z.object({
  overall: OverallGgrSchema.optional(),
  ngr: NgrSchema.optional(),
  sportBook: SportBookGgrSchema.optional(),
  sportExchange: SportExchangeGgrSchema.optional(),
  games: GamesGgrSchema.optional(),
  poker: PokerGgrSchema.optional(),
});

export type GgrStatistics = z.infer<typeof GgrStatisticsSchema>;

export const GgrStatisticsRangeSchema = z.object({
  overall: z.string().optional(),
  sportExchange: z.string().optional(),
  games: z.string().optional(),
  sportsBook: z.string().optional(),
  poker: z.string().optional(),
  ngr: z.string().optional(),
});

export type GgrStatisticsRange = z.infer<typeof GgrStatisticsRangeSchema>;
