import { ENV } from '@common/env';
import { EventNamespace } from '@infrastructure/event/namespace';
import { REDIS_KEY__PARTNER_MATRIX_TRANSACTIONS } from '@infrastructure/redis/keys';
import { UserDepositEvent } from '@modules/transaction-ledger/event/user-deposit.event';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { CreateTransactionBody } from '@external/partner-matrix/bodies';
import { Product } from '@external/partner-matrix/constants';
import { pointsToUsd } from '@utils/points-to-usd';

@Injectable()
export class DepositsEventHandler {
  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @OnEvent(EventNamespace.USER_DEPOSIT)
  async handleUserDeposit(eventData: UserDepositEvent): Promise<void> {
    if (!eventData.pmId || !eventData.pmBtag) return;

    const redisData: CreateTransactionBody = {
      skin_id: this.configService.getOrThrow<number>(ENV.PM_SKIN_ID),
      datetime: new Date().toISOString().slice(0, 10),
      product_id: Product.CPA,
      player_external_id: eventData.pmId,
      currency: 'USD',
      transactions: [
        {
          external_id: eventData.transactionId,
          type: 'deposit',
          amount: pointsToUsd(eventData.pointsAmount.toNumber()),
        },
      ],
    };

    await this.redis.lpush(
      REDIS_KEY__PARTNER_MATRIX_TRANSACTIONS,
      JSON.stringify(redisData),
    );
  }
}
