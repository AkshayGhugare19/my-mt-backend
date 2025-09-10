export function getRefreshTokenRedisKey(token: string): string {
  return `refresh-token:${token}`;
}
export function getUserRefreshTokenRedisKey(userId: string): string {
  return `user-refresh-token:${userId}`;
}

export function getJwtBlacklistRedisKey(token: string): string {
  return `jwt-blacklist:${token}`;
}
