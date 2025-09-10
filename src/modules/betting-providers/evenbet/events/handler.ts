import { ENV } from '@common/env';
import {
  EvenbetCreditEvent,
  EvenbetDebitEvent,
} from '@infrastructure/event/classes';
import { EventNamespace } from '@infrastructure/event/namespace';
import { REDIS_KEY__PARTNER_MATRIX_TRANSACTIONS } from '@infrastructure/redis/keys';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { CreateTransactionBody } from '@external/partner-matrix/bodies';
import { Product } from '@external/partner-matrix/constants';

export class EvenbetEventHandler {
  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @OnEvent(EventNamespace.EVENBET_DEBIT)
  async handleDebit(eventData: EvenbetDebitEvent): Promise<void> {
    if (!eventData.pmId || !eventData.pmBtag) return;

    const redisData: CreateTransactionBody = {
      skin_id: this.configService.getOrThrow<number>(ENV.PM_SKIN_ID),
      datetime: new Date().toISOString().slice(0, 10),
      product_id: Product.Poker,
      player_external_id: eventData.pmId,
      currency: 'USD',
      transactions: [
        {
          external_id: eventData.transactionId,
          type: 'stake_amount',
          amount: eventData.amount.toNumber(),
        },
      ],
    };

    await this.redis.lpush(
      REDIS_KEY__PARTNER_MATRIX_TRANSACTIONS,
      JSON.stringify(redisData),
    );
  }

  @OnEvent(EventNamespace.EVENBET_CREDIT)
  async handleCredit(eventData: EvenbetCreditEvent): Promise<void> {
    if (!eventData.pmId || !eventData.pmBtag) return;

    const redisData: CreateTransactionBody = {
      skin_id: this.configService.getOrThrow<number>(ENV.PM_SKIN_ID),
      datetime: new Date().toISOString().slice(0, 10),
      product_id: Product.Poker,
      player_external_id: eventData.pmId,
      currency: 'USD',
      transactions: [
        {
          external_id: eventData.transactionId,
          type: 'win_amount',
          amount: eventData.amount.toNumber(),
        },
      ],
    };

    await this.redis.lpush(
      REDIS_KEY__PARTNER_MATRIX_TRANSACTIONS,
      JSON.stringify(redisData),
    );
  }
}
