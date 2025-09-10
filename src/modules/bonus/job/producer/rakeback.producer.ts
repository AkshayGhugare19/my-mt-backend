import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import { BonusRakebackJobData } from '@infrastructure/queue/bull/constants/job-data';
import { BULL_QUEUE } from '@infrastructure/queue/bull/constants/queue';
import { REDIS_KEY__BONUS_RAKEBACK_LAST_RUN } from '@infrastructure/redis/keys';
import {
  BonusTriggerConfigTypes,
  BonusTriggerTypes,
} from '@modules/bonus/enum';
import { RakebackProducerTriggerConfigSchema } from '@modules/bonus/schema/trigger/validators/producer/rakeback-producer.schema';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { DateTime } from 'luxon';

@Injectable()
export class RakebackProducer {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prismaService: PrismaService,
    private readonly asyncLogService: AsyncLogService,
    @InjectQueue(BULL_QUEUE.BONUS_QUEUE) private readonly queue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async runRakeback(): Promise<void> {
    this.asyncLogService.init(async () => {
      const rakebackBonus = await this.prismaService.bonus.findFirst({
        where: {
          bonusTriggerProducerConfig: {
            some: {
              trigger: {
                configType: BonusTriggerConfigTypes.RAKEBACK,
                type: BonusTriggerTypes.PRODUCER,
              },
            },
          },
        },
        include: {
          bonusTriggerProducerConfig: true,
        },
      });

      if (
        !rakebackBonus ||
        rakebackBonus?.bonusTriggerProducerConfig?.length === 0
      ) {
        this.asyncLogService.log({ rakebackBonus }, 'rakebackNotExisting');
        return;
      }

      const rakebackConfig = RakebackProducerTriggerConfigSchema.safeParse(
        rakebackBonus.bonusTriggerProducerConfig[0].config,
      );

      if (!rakebackConfig.success) {
        this.asyncLogService.log({ rakebackBonus }, 'invalidConfig');
        return;
      }

      if (
        rakebackConfig.data.startDate > DateTime.now().toJSDate() ||
        rakebackConfig.data.runHour !== DateTime.now().hour
      ) {
        this.asyncLogService.log(
          {
            now: DateTime.now(),
            configRunHour: rakebackConfig.data.runHour,
            configStartDate: rakebackConfig.data.startDate,
          },
          'invalidStartDateOrRunHour',
        );
        return;
      }

      const rakebackLastRun = await this.redis.get(
        REDIS_KEY__BONUS_RAKEBACK_LAST_RUN,
      );

      if (rakebackLastRun) {
        const nextRun = DateTime.fromISO(rakebackLastRun)
          .plus({ hours: rakebackConfig.data.timeBetweenRuns })
          .toJSDate();

        if (nextRun > DateTime.now().toJSDate()) {
          this.asyncLogService.log(
            { now: DateTime.now(), lastRun: rakebackLastRun, nextRun },
            'invalidRunDate',
          );
          return;
        }
      }

      const userRakes = (
        await this.prismaService.pokerRake.groupBy({
          by: 'userId',
          _sum: {
            rake: true,
          },
          where: {
            uploadDate: {
              gte: DateTime.now()
                .minus({ days: rakebackConfig.data.dayRange })
                .startOf('day')
                .toISO(),
              lt: DateTime.now().startOf('day').toISO(),
            },
          },
        })
      ).filter((entry) => entry._sum.rake !== null);
      this.asyncLogService.log(userRakes, 'userRakes');

      this.queue.addBulk(
        userRakes.map((entry) => {
          const data: BonusRakebackJobData = {
            userId: entry.userId,
            totalRake: entry._sum.rake?.toNumber() as number,
            bonusId: rakebackBonus.id,
            bonusName: rakebackBonus.name,
          };

          return {
            name: JOB.BONUS_RAKEBACK,
            data,
          };
        }),
      );

      this.redis.set(
        REDIS_KEY__BONUS_RAKEBACK_LAST_RUN,
        DateTime.now().startOf('day').toISO(),
      );
    });
  }
}
