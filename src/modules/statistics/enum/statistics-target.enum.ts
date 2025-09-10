export const StatisticsTargets = {
  USER: 'user',
  VIP: 'vip',
  ALL: 'all',
} as const;

export type StatisticsTarget =
  (typeof StatisticsTargets)[keyof typeof StatisticsTargets];
