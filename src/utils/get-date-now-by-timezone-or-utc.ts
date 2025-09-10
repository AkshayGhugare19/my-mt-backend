import { DateTime } from 'luxon';

export function getDateNowByTimezoneOrUtc(timezone?: string): DateTime {
  return DateTime.now().setZone(timezone || 'utc');
}
