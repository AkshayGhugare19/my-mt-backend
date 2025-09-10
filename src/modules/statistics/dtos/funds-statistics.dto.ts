import { z } from 'zod';

export const FundsCountAndValueSchema = z.object({
  count: z.number(),
  value: z.string(),
});

export const FundsStatisticsSchema = z.object({
  totalUsersFunds: z.string().optional(),
  depositsToday: FundsCountAndValueSchema.optional(),
  depositsThisWeek: FundsCountAndValueSchema.optional(),
  depositsThisMonth: FundsCountAndValueSchema.optional(),
  allTimeDeposits: FundsCountAndValueSchema.optional(),
  withdrawalsToday: FundsCountAndValueSchema.optional(),
  withdrawalsThisWeek: FundsCountAndValueSchema.optional(),
  withdrawalsThisMonth: FundsCountAndValueSchema.optional(),
  allTimeWithdrawals: FundsCountAndValueSchema.optional(),
  netFlowToday: z.string().optional(),
  netFlowThisWeek: z.string().optional(),
  netFlowThisMonth: z.string().optional(),
  allTimeNetFlow: z.string().optional(),
  tokensIssuedToMastersThisWeek: z.string().optional(),
  tokensInCirculation: z.string().optional(),
  tokensIssuedToday: z.string().optional(),
  tokensIssuedThisWeek: z.string().optional(),
  tokensIssuedThisMonth: z.string().optional(),
  allTimeTokensIssued: z.string().optional(),
  allTimeTokensIssuedToMasters: z.string().optional(),
  volumePlayedToday: z.string().optional(),
  volumePlayedThisWeek: z.string().optional(),
  volumePlayedThisMonth: z.string().optional(),
  allTimeVolumePlayed: z.string().optional(),
  masterGrossPnl: z.string().optional(),
  masterNetPnl: z.string().optional(),
  masterDebt: z.string().optional(),
  ownDebt: z.string().optional(),
});

export type FundsStatistics = z.infer<typeof FundsStatisticsSchema>;
