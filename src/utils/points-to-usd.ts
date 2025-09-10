import { ENV } from '@common/env';

export function pointsToUsd(points: number): number {
  const usdPointsStr = process.env[ENV.USD_POINTS];
  if (!usdPointsStr) {
    throw new Error('USD_POINTS env variable is not defined');
  }
  const usdPoints = parseFloat(usdPointsStr);
  return points / usdPoints;
}
