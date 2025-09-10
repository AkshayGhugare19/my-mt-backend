import { z } from 'zod';

export const UsersStatisticsSchema = z.object({
  totalUsers: z.number(),
  totalActiveUsersToday: z.number(),
  totalActiveUsersLast7Days: z.number(),
  usersJoinedToday: z.number(),
});

export type UsersStatistics = z.infer<typeof UsersStatisticsSchema>;
