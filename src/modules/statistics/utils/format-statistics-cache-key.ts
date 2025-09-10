import { StatisticsTarget } from '@modules/statistics/enum/statistics-target.enum';
import { FundsCategories, GgrCategories } from '@modules/statistics/types';
import { DateTime } from 'luxon';

export function formatStatisticsCacheKey(target: StatisticsTarget, category: GgrCategories | FundsCategories, masterId?: string, startDate?: DateTime, endDate?: DateTime): string {
  let cacheKey = `cache:statistics:${target}:${category}`

  if (masterId) cacheKey += `:${masterId}`
  if (startDate) cacheKey += `:${startDate.toFormat('yyyy-MM-dd')}`
  if (endDate) cacheKey += `:${endDate.toFormat('yyyy-MM-dd')}`

  return cacheKey
}
