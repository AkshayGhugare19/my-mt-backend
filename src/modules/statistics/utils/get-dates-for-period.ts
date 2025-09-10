import { DateTime } from 'luxon';

/**
 * Get the start and end dates for a given period
 * @param period - The period to get the dates for
 * @returns [startDate, endDate] - where start date is the older date and end date is the newer date
 */
export function getDatesForPeriod(period: 'today' | 'week' | 'month' | 'all'): [DateTime | undefined, DateTime | undefined] {
  const now = DateTime.now();

  switch (period) {
    case 'today':
      return [now.setZone('UTC').startOf('day'), undefined];
    case 'week':
      return [now.setZone('UTC').minus({ days: 7 }).startOf('day'), undefined];
    case 'month':
      return [now.setZone('UTC').minus({ months: 1 }).startOf('day'), undefined];
    case 'all':
      return [undefined, undefined];
  }
}
