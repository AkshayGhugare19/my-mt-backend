export function getLastBonusCronRunRedisKey(bonusId: string): string {
  return `last-bonus-cron-run:${bonusId}`;
}
