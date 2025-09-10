import { DateTime } from 'luxon';

export function getExpirationTime(
  expiryTime: number | null | undefined,
  expiryHour: number | null,
): Date | null {
  if (!expiryTime) {
    return null;
  }
  const date = DateTime.now().plus({ millisecond: expiryTime });
  if (expiryHour) {
    date.set({ hour: expiryHour });
  }
  return date.toJSDate();
}
