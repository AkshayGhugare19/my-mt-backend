import { Redis } from 'ioredis';

export const getTronPrice = async (cacheManager: Redis): Promise<any> => {
  let tokenPrice = (await cacheManager.get('TRON_PRICE')) ?? 0;

  if (tokenPrice) {
    return tokenPrice;
  }

  tokenPrice = await getTronPriceInUsd();

  await cacheManager.set('TRON_PRICE', tokenPrice, 'PX', 120000);

  return tokenPrice;
};

const getTronPriceInUsd = async (): Promise<number> => {
  return fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd',
  )
    .then((response) => response.json())
    .then((res) => res?.tron?.usd)
    .catch(() => {
      return 0;
    });
};
