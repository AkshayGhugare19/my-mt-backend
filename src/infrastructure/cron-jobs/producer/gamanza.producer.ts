import { ONE_MINUTE_IN_MS } from '@common/constants';
import { ENV } from '@common/env';
import { GamanzaEngageService } from '@external/gamanza-engage/service/gamanza-engage.service';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import { GamanzaRewardBonusJobData } from '@infrastructure/queue/bull/constants/job-data';
import { BULL_QUEUE } from '@infrastructure/queue/bull/constants/queue';
import { REDIS_KEY__GAMANZA_LATEST_REWARD } from '@infrastructure/redis/keys';
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Queue } from 'bull';
import Redis from 'ioredis';
import Redlock, { Lock } from 'redlock';

@Injectable()
export class GamanzaProducer {
  private readonly _logger = new Logger(GamanzaProducer.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    private readonly gamanzaService: GamanzaEngageService,
    @InjectQueue(BULL_QUEUE.GAMANZA_QUEUE) private readonly gamanzaQueue: Queue,
    private readonly redlock: Redlock,
  ) {}

  // Currently only process bonus-offer rewards
  @Cron(CronExpression.EVERY_10_SECONDS)
  async synchronizeRewards(): Promise<void> {
    if (this.configService.get(ENV.DISABLE_CRON_GAMANZA_REWARDS)) {
      return;
    }

    let lock: Lock;
    try {
      lock = await this.redlock.acquire(
        ['cron:synchronize-gamanza-rewards'],
        ONE_MINUTE_IN_MS,
        {
          retryCount: 0,
        },
      );
    } catch (error) {
      this._logger.error(
        {
          message: 'Error while acquiring lock',
        },
        'update',
      );
      return;
    }

    try {
      const latestReward =
        (await this.redis.get(REDIS_KEY__GAMANZA_LATEST_REWARD)) || undefined;

      const rewardShopOrders = await this.gamanzaService.getRewardsInformation({
        limit: 1000,
        delta: latestReward,
      });

      if (!rewardShopOrders) return;

      for (const reward of rewardShopOrders.data) {
        if (
          reward.earnedReward.type !== 'bonus_offer' ||
          !reward.earnedReward.bonusOfferId
        ) {
          continue;
        }

        const jobData: GamanzaRewardBonusJobData = {
          userId: reward.playerId,
          bonusId: reward.earnedReward.bonusOfferId,
        };

        this.gamanzaQueue.add(JOB.GAMANZA_REWARD_BONUS, jobData, {
          attempts: 3,
          removeOnComplete: false,
          removeOnFail: false,
        });

        await this.redis.set(
          REDIS_KEY__GAMANZA_LATEST_REWARD,
          new Date().toISOString(),
        );
      }
    } catch (error) {
      this._logger.error(
        {
          error: error.message,
          stack: error.stack,
          message: 'Error while fetching Gamanza rewards',
        },
        'start',
      );
    } finally {
      if (lock) await lock.release();
    }
  }
}
