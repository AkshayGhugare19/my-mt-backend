import { FundsStatisticsSchema } from '@modules/statistics/dtos/funds-statistics.dto';
import { GgrStatisticsSchema } from '@modules/statistics/dtos/ggr-statistics.dto';
import { UsersStatisticsSchema } from '@modules/statistics/dtos/users-statistics.dto';
import { z } from 'zod';

export const AllStatisticsSchema = z.object({
  users: UsersStatisticsSchema.optional(),
  ggr: GgrStatisticsSchema.optional(),
  funds: FundsStatisticsSchema.optional(),
});

export type AllStatistics = z.infer<typeof AllStatisticsSchema>;
