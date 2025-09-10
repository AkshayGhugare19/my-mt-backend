import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { BinanceApi } from '@external/binance/api';
import { TatumApi } from '@external/tatum/api';
import {
  REDIS_KEY__BINANCE_ETH_USDC,
  REDIS_KEY__BINANCE_ETH_USDT,
  REDIS_KEY__BINANCE_SOL_USDC,
  REDIS_KEY__BINANCE_SOL_USDT,
  REDIS_KEY__BINANCE_TRX_USDC,
  REDIS_KEY__BINANCE_TRX_USDT,
  REDIS_KEY__TATUM_USDC_EUR,
  REDIS_KEY__TATUM_USDC_PHP,
  REDIS_KEY__TATUM_USDC_USD,
  REDIS_KEY__TATUM_USDT_EUR,
  REDIS_KEY__TATUM_USDT_PHP,
  REDIS_KEY__TATUM_USDT_USD,
} from '@infrastructure/redis/keys';

@Injectable()
export class ExchangeRateCron {
  constructor(
    private readonly binanceApi: BinanceApi,
    private readonly tatumApi: TatumApi,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async updateBinanceExchangeRates(): Promise<void> {
    const binanceResponse = await this.binanceApi.symbolPriceTicker({
      symbols: '["SOLUSDT","ETHUSDT","TRXUSDT","SOLUSDC","ETHUSDC","TRXUSDC"]',
    });

    await Promise.all(
      binanceResponse?.map((curr) => {
        if (curr.symbol === 'SOLUSDT') {
          return this.redis.setex(REDIS_KEY__BINANCE_SOL_USDT, 180, curr.price);
        }

        if (curr.symbol === 'ETHUSDT') {
          return this.redis.setex(REDIS_KEY__BINANCE_ETH_USDT, 180, curr.price);
        }

        if (curr.symbol === 'TRXUSDT') {
          return this.redis.setex(REDIS_KEY__BINANCE_TRX_USDT, 180, curr.price);
        }

        if (curr.symbol === 'SOLUSDC') {
          return this.redis.setex(REDIS_KEY__BINANCE_SOL_USDC, 180, curr.price);
        }

        if (curr.symbol === 'ETHUSDC') {
          return this.redis.setex(REDIS_KEY__BINANCE_ETH_USDC, 180, curr.price);
        }

        if (curr.symbol === 'TRXUSDC') {
          return this.redis.setex(REDIS_KEY__BINANCE_TRX_USDC, 180, curr.price);
        }

        return null;
      }) || [],
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateTatumExchangeRates(): Promise<void> {
    const tatumResponse = await this.tatumApi.getExchangeRate([
      { batchId: '1', currency: 'USDT', basePair: 'USD' },
      { batchId: '1', currency: 'USDT', basePair: 'EUR' },
      { batchId: '1', currency: 'USDT', basePair: 'PHP' },
      { batchId: '1', currency: 'USDC', basePair: 'USD' },
      { batchId: '1', currency: 'USDC', basePair: 'EUR' },
      { batchId: '1', currency: 'USDC', basePair: 'PHP' },
    ]);

    await Promise.all(
      tatumResponse?.map((curr) => {
        if (curr.basePair === 'USD') {
          return this.redis.setex(REDIS_KEY__TATUM_USDT_USD, 180, curr.value);
        }

        if (curr.basePair === 'EUR') {
          return this.redis.setex(REDIS_KEY__TATUM_USDT_EUR, 180, curr.value);
        }

        if (curr.basePair === 'PHP') {
          return this.redis.setex(REDIS_KEY__TATUM_USDT_PHP, 180, curr.value);
        }

        if (curr.basePair === 'USD') {
          return this.redis.setex(REDIS_KEY__TATUM_USDC_USD, 180, curr.value);
        }

        if (curr.basePair === 'EUR') {
          return this.redis.setex(REDIS_KEY__TATUM_USDC_EUR, 180, curr.value);
        }

        if (curr.basePair === 'PHP') {
          return this.redis.setex(REDIS_KEY__TATUM_USDC_PHP, 180, curr.value);
        }

        return null;
      }) || [],
    );
  }
}
