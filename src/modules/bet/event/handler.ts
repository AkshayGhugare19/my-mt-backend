import { ENV } from '@common/env';
import { EventNamespace } from '@infrastructure/event/namespace';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { CreateTransactionBody } from '@external/partner-matrix/bodies';
import { Product } from '@external/partner-matrix/constants';
import { REDIS_KEY__PARTNER_MATRIX_TRANSACTIONS } from '@infrastructure/redis/keys';
import { BetProviders } from '../enum/bet-providers.enum';
import { BetTransactionEvent } from '@modules/bet/event/bet-transaction.event';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { TransactionTargetBalances } from '@modules/transaction-ledger/enum/target-balance.enum';

@Injectable()
export class BetsEventHandler {
  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  getProductId(provider: string): number {
    switch (provider) {
      case BetProviders.SPORTS_EXCHANGE:
        return Product.Sports;
      case BetProviders.SLOTEGRATOR_SPORTSBOOK:
        return Product.Sports;
      case BetProviders.SLOTEGRATOR_GAMES:
        return Product.Casino;
      default:
        throw new Error('Provider does not exist');
    }
  }

  @OnEvent(EventNamespace.BET_TRANSACTION)
  async handleBetTransaction(eventData: BetTransactionEvent): Promise<void> {
    console.log('eventData', eventData);
    if (
      eventData.pmId &&
      eventData.pmBtag &&
      eventData.transactionId &&
      eventData.amount.gt(0) &&
      eventData.operationType === TransactionOperationTypes.DEBIT &&
      eventData.targetBalance === TransactionTargetBalances.ACCOUNT_BALANCE
    ) {
      const placeBetData: CreateTransactionBody = {
        skin_id: this.configService.getOrThrow<number>(ENV.PM_SKIN_ID),
        datetime: new Date().toISOString().slice(0, 10),
        product_id: this.getProductId(eventData.provider),
        player_external_id: eventData.pmId,
        currency: 'USD',
        transactions: [
          {
            external_id: eventData.transactionId,
            type: 'stake_amount',
            amount: eventData.usdAmount.toNumber(),
          },
        ],
      };
      await this.redis.lpush(REDIS_KEY__PARTNER_MATRIX_TRANSACTIONS, JSON.stringify(placeBetData));
    }

    if (
      eventData.pmId &&
      eventData.pmBtag &&
      eventData.usdAmount.gt(0) &&
      eventData.operationType === TransactionOperationTypes.CREDIT &&
      eventData.targetBalance === TransactionTargetBalances.ACCOUNT_BALANCE
    ) {
      const redisData: CreateTransactionBody = {
        skin_id: this.configService.getOrThrow<number>(ENV.PM_SKIN_ID),
        datetime: new Date().toISOString().slice(0, 10),
        product_id: this.getProductId(eventData.provider),
        player_external_id: eventData.pmId,
        currency: 'USD',
        transactions: [
          {
            external_id: eventData.transactionId,
            type: 'win_amount',
            amount: eventData.usdAmount.toNumber(),
          },
        ],
      };

      await this.redis.lpush(REDIS_KEY__PARTNER_MATRIX_TRANSACTIONS, JSON.stringify(redisData));
    }
  }
}
