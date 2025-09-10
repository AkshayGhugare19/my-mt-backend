import { ONE_HOUR_IN_MS } from '@common/constants';
import { OnEvents } from '@common/decorators/on-events.decorator';
import { ENV } from '@common/env';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { EventNamespace } from '@infrastructure/event/namespace';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import { BULL_QUEUE } from '@infrastructure/queue/bull/constants/queue';
import { defaultJobConfig } from '@infrastructure/queue/bull/queue-config';
import { BetSettledEvent } from '@modules/bet/event/bet-settled.event';
import {
  BonusTriggerConfigTypes,
  BonusTriggerTypes,
} from '@modules/bonus/enum';
import { BonusTriggerConfig } from '@modules/bonus/schema/trigger';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { BonusService } from '@modules/bonus/service/bonus.service';
import { BonusWithTriggers } from '@modules/bonus/types';
import { getLastBonusCronRunRedisKey } from '@modules/bonus/utils/redis-key';
import { Roles } from '@modules/role/enum/role.enum';
import { RoleService } from '@modules/role/service/role.service';
import { UserDepositEvent } from '@modules/transaction-ledger/event/user-deposit.event';
import { UserConfigService } from '@modules/user-config/service/user-config.service';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Bonus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Queue } from 'bull';
import { Redis } from 'ioredis';
import { DateTime } from 'luxon';

@Injectable()
export class BonusJobProducer {
  constructor(
    private readonly asyncLogService: AsyncLogService,
    private readonly prismaService: PrismaService,
    private readonly bonusService: BonusService,
    @InjectQueue(BULL_QUEUE.BONUS_QUEUE)
    private readonly queue: Queue,
    @InjectQueue(BULL_QUEUE.WAGERING_BET_QUEUE)
    private readonly wageringBetQueue: Queue,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly roleService: RoleService,
    private readonly userConfigService: UserConfigService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async triggerCron(): Promise<void> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      return;
    }
    await this.handleCron();
  }

  @OnEvents([EventNamespace.USER_DEPOSIT])
  async onDeposit(event: UserDepositEvent): Promise<void> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      return;
    }

    const userRoles = await this.roleService.getUserRoles(event.userId);
    if (userRoles.some((role) => role.name === Roles.VIP_USER)) {
      const isBonusEnabled = await this.userConfigService.isUserBonusEnabled(
        event.userId,
      );
      if (!isBonusEnabled) {
        return;
      }
    }

    this.queue.add(JOB.BONUS_HANDLE_DEPOSIT, event, {
      attempts: 2,
      backoff: 1000,
      ...defaultJobConfig,
    });
  }

  @OnEvents([EventNamespace.BET_SETTLED])
  async onBetSettlement(event: BetSettledEvent): Promise<void> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      return;
    }

    const userRoles = await this.roleService.getUserRoles(event.userId);
    if (userRoles.some((role) => role.name === Roles.VIP_USER)) {
      const isBonusEnabled = await this.userConfigService.isUserBonusEnabled(
        event.userId,
      );
      if (!isBonusEnabled) {
        return;
      }
    }

    this.wageringBetQueue.add(JOB.BONUS_WAGERING_BET_SETTLED, event, {
      attempts: 2,
      backoff: 1000,
      ...defaultJobConfig,
    });
  }

  async handleCron(): Promise<void> {
    this.asyncLogService.init(async () => {
      const bonuses = await this.bonusService.findByTriggerConfigType({
        triggerType: BonusTriggerTypes.PRODUCER,
        triggerConfigType: BonusTriggerConfigTypes.CASHBACK,
      });
      this.asyncLogService.log(bonuses, 'foundBonuses');
      const filtered = await Promise.all(
        bonuses.map(async (bonus) => await this.verifyBonusConfig(bonus)),
      );
      const filteredWithoutNull = filtered.filter(
        (f): f is NonNullable<BonusWithTriggers> => !!f,
      );

      for (const bonus of filteredWithoutNull) {
        const eligibleUsers = await this.getEligibleUsersForCashback(bonus);
        this.asyncLogService.log(eligibleUsers, 'eligibleUsers');

        await this.queue.addBulk(
          eligibleUsers.map(
            ({ id, delta }) =>
              ({
                name: JOB.BONUS_HANDLE_CASHBACK,
                data: { userId: id, bonusId: bonus.id, delta },
                opts: {
                  attempts: 2,
                  backoff: 1000,
                },
              }) as {
                name?: string | undefined;
                data: { userId: string; bonusId: string };
              },
          ),
        );
        await this.redis.set(
          getLastBonusCronRunRedisKey(bonus.id),
          DateTime.now().startOf('day').toISO(),
        );
      }
    });
  }

  private async verifyBonusConfig(
    bonus: BonusWithTriggers,
  ): Promise<Bonus | null> {
    for (const trigger of bonus.bonusTriggerProducerConfig) {
      const config = trigger.config as BonusTriggerConfig;
      if (
        config.runHour === null ||
        config.runHour === undefined ||
        !config.timeBetweenRuns ||
        !config.lossRewardDayRange
      ) {
        this.asyncLogService.log({ trigger, config }, 'invalidBonus');
        continue;
      }
      const lastRun =
        (await this.redis.get(getLastBonusCronRunRedisKey(bonus.id))) || 0;
      if (
        config.startDate &&
        new Date(config.startDate).getTime() > Date.now()
      ) {
        this.asyncLogService.log(
          {
            configStartDate: config.startDate,
            now: Date.now(),
            startDate: new Date(config.startDate).getTime(),
          },
          'startDateNotValid',
        );

        continue;
      }
      if (
        new Date(lastRun).getTime() + config.timeBetweenRuns * ONE_HOUR_IN_MS >
        Date.now()
      ) {
        this.asyncLogService.log(
          {
            lastRunDate: new Date(lastRun).getTime(),
            lastRun: config.timeBetweenRuns,
          },
          'lastRunNotValid',
        );
        continue;
      }
      const hour = DateTime.now().hour;
      this.asyncLogService.log(
        {
          hour,
          configHour: config.runHour,
        },
        'hourValidation',
      );
      return hour !== config.runHour ? null : bonus;
    }
    return null;
  }

  private async eligibleUsersWithLimitPerUser(
    bonus: Bonus,
  ): Promise<{ id: string }[]> {
    if (!bonus.limitPerUser) {
      return await this.prismaService.user.findMany({
        where: {
          deletedAt: null,
          active: true,
          blockedAt: null,
          userRoles: {
            some: {
              role: {
                name: {
                  in: [Roles.USER],
                },
              },
            },
          },
        },
        select: {
          id: true,
        },
      });
    }
    const sql = Prisma.sql`
    select u.id as id
    from users u 
    join (
        select user_id as id
        from user_roles ur
        where
          ur.role_id in (
            select id from roles r where r.name in (
              ${Prisma.join([Roles.USER, Roles.VIP_USER])}
            )
          )
        ) as filtered_users on filtered_users.id = u.id
    left join (
      select user_id
      from user_bonus_progressions ubp 
      where ubp.bonus_id = '${bonus.id}'
      group by user_id  
      having COUNT(user_id) < ${bonus.limitPerUser}
      ) as A
    on A.user_id = u.id 
    where A.user_id is NULL 
    and u.deleted_at is NULL 
    and u.active = true
    and blocked_at is NULL;
  `;
    return this.prismaService.$queryRaw(sql);
  }

  private async getEligibleUsersForCashback(bonus: Bonus): Promise<
    {
      id: string;
      delta: Decimal;
    }[]
  > {
    if (!bonus.limitPerUser) {
      return await this.prismaService.$queryRaw<
        { id: string; delta: Decimal }[]
      >(
        Prisma.sql`
            SELECT u.id as id, b.total_settlement_amount as delta
            FROM users u
            JOIN (
                SELECT user_id, SUM(settlement_amount) AS total_settlement_amount
                FROM bets
                WHERE created_at BETWEEN CURRENT_DATE - INTERVAL '10 days' AND CURRENT_DATE - INTERVAL '3 days'
                GROUP BY user_id
                HAVING SUM(settlement_amount) <= 0
            ) b ON u.id = b.user_id
            JOIN (
            SELECT user_id AS id
            FROM user_roles ur
            WHERE
              ur.role_id IN (
                SELECT id FROM roles r WHERE r.name IN (
                  ${Prisma.join([Roles.USER, Roles.VIP_USER])}
                )
              )
            ) AS filtered_users ON filtered_users.id = u.id
          `,
      );
    }

    return await this.prismaService.$queryRaw<{ id: string; delta: Decimal }[]>(
      Prisma.sql`
          SELECT u.id as id, b.total_settlement_amount as delta
          FROM users u
          JOIN (
              SELECT user_id, SUM(settlement_amount) AS total_settlement_amount
              FROM bets
              WHERE created_at BETWEEN CURRENT_DATE - INTERVAL '10 days' AND CURRENT_DATE - INTERVAL '3 days'
              GROUP BY user_id
              HAVING SUM(settlement_amount) <= 0
          ) b ON u.id = b.user_id
          JOIN (
          SELECT user_id AS id
          FROM user_roles ur
          WHERE
            ur.role_id IN (
              SELECT id FROM roles r WHERE r.name IN (
                ${Prisma.join([Roles.USER, Roles.VIP_USER])}
              )
            )
          ) AS filtered_users ON filtered_users.id = u.id
          LEFT JOIN (
            SELECT user_id
            FROM user_bonus_progressions ubp 
            WHERE ubp.bonus_id = '${bonus.id}'
            GROUP by user_id  
            HAVING COUNT(user_id) < ${bonus.limitPerUser}
            ) AS A
          ON A.user_id = u.id 
          WHERE A.user_id IS NULL 
          AND u.deleted_at IS NULL 
          AND u.active = true
          AND blocked_at IS NULL;
      `,
    );
  }
}
