import { ENV } from '@common/env';

export function usdtToPoints(usdt: number): number {
  const usdPointsStr = process.env[ENV.USD_POINTS];
  if (!usdPointsStr) {
    throw new Error('USD_POINTS env variable is not defined');
  }
  const usdPoints = parseFloat(usdPointsStr);
  return usdPoints * usdt;
}
