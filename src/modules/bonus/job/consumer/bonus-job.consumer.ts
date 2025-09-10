import { ENV } from '@common/env';
import { NotificationCodes } from '@infrastructure/database/prisma/constants';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import { BonusRakebackJobData } from '@infrastructure/queue/bull/constants/job-data';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import {
  BonusProgressStatuses,
  BonusTriggerConfigTypes,
  BonusTriggerTargets,
  BonusTypes,
} from '@modules/bonus/enum';
import { ProducerEventHandler } from '@modules/bonus/handlers/producer-event-handler';
import { CashbackProducerStrategy } from '@modules/bonus/handlers/strategy';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { BonusBalanceService } from '@modules/bonus/service/bonus-balance.service';
import { BonusNotificationService } from '@modules/bonus/service/bonus-notification.service';
import { BonusProgressionService } from '@modules/bonus/service/bonus-progression.service';
import {
  CreateUserBonusBalance,
  CreateUserBonusProgression,
} from '@modules/bonus/types';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { Roles } from '@modules/role/enum/role.enum';
import { RoleService } from '@modules/role/service/role.service';
import { TransactionCounterParties } from '@modules/transaction-ledger/enum/counter-party.enum';
import { UserDepositEvent } from '@modules/transaction-ledger/event/user-deposit.event';
import { UserConfigService } from '@modules/user-config/service/user-config.service';
import {
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToDollarsValue } from '@utils/decimal-to-dollar-value';
import { Job } from 'bull';
import { DateTime } from 'luxon';

@Processor(QueuesDefinition.BONUS_QUEUE.name ?? '')
export class BonusJobConsumer {
  private readonly _logger = new Logger(BonusJobConsumer.name);
  constructor(
    private readonly cashbackProducerStrategy: CashbackProducerStrategy,
    private readonly bonusProgressionService: BonusProgressionService,
    private readonly bonusBalanceService: BonusBalanceService,
    private readonly prismaService: PrismaService,
    private readonly asyncLogService: AsyncLogService,
    private readonly bonusNotificationService: BonusNotificationService,
    private readonly producerEventHandler: ProducerEventHandler,
    private readonly configService: ConfigService,
    private readonly roleService: RoleService,
    private readonly userConfigService: UserConfigService,
    private readonly notificationService: NotificationsService,
  ) {}

  @OnQueueCompleted()
  public onComplete(job: Job): any {
    this._logger.debug(`Completed job ${job.id} of type ${job.name}`);
  }

  @OnQueueFailed()
  public onError(job: Job<any>, error: any): any {
    this._logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }

  @Process(JOB.BONUS_HANDLE_CASHBACK)
  async processCashback(
    job: Job<{ userId: string; bonusId: string; delta: Decimal }>,
  ): Promise<void> {
    // eslint-disable-next-line sonarjs/cognitive-complexity
    await this.asyncLogService.init(async () => {
      const { userId, bonusId, delta } = job.data;

      const userRoles = await this.roleService.getUserRoles(userId);
      if (userRoles.some((role) => role.name === Roles.VIP_USER)) {
        const isBonusEnabled =
          await this.userConfigService.isUserBonusEnabled(userId);
        if (!isBonusEnabled) {
          this.asyncLogService.log(
            { data: job.data },
            'CashbackJobConsumer.process.vipUserNotAllowed',
          );
          return;
        }
      }
      this.asyncLogService.log(
        { data: job.data },
        'CashbackJobConsumer.process',
      );

      const bonus = await this.prismaService.bonus.findUnique({
        where: {
          id: bonusId,
        },
        include: {
          bonusTriggerProducerConfig: {
            where: {
              type: BonusTriggerConfigTypes.CASHBACK,
            },
          },
        },
      });
      if (!bonus) {
        this.asyncLogService.log(
          { bonus },
          'CashbackJobConsumer.bonusNotFound',
        );

        this._logger.error(`Bonus with id ${bonusId} not found`);
        return;
      }

      const progress: CreateUserBonusProgression[] = [];
      const balance: CreateUserBonusBalance[] = [];
      if (bonus.type === BonusTypes.PROGRESS) {
        const createdProgress =
          await this.cashbackProducerStrategy.createProgressEntity({
            bonus,
            event: {
              userId,
            },
          });
        this.asyncLogService.log({ progress }, 'generateBonusEntries.progress');
        if (createdProgress) {
          progress.push(createdProgress);
        }
      }
      if (bonus.type === BonusTypes.INSTANT) {
        const createBalance =
          await this.cashbackProducerStrategy.createBonusBalanceEntity({
            bonus,
            event: {
              userId,
              delta,
            },
          });
        this.asyncLogService.log({ balance }, 'generateBonusEntries.balance');
        if (createBalance) {
          balance.push(createBalance);
          progress.push({
            bonusId: bonus.id,
            currentProgress: 0,
            rewardAmount: createBalance.balance,
            targetProgress: 0,
            userId,
            status: BonusProgressStatuses.COMPLETED,
            claimedAt: DateTime.now().toJSDate(),
          });
        }
      }
      this.asyncLogService.log({ progress }, 'CashbackJobConsumer.progress');

      if (!progress.length) {
        this._logger.debug(`Progress not created for userId ${userId}`);
        return;
      }
      await this.prismaService.$transaction(async (transactionManager) => {
        await this.bonusProgressionService.createMany(
          progress,
          transactionManager,
        );
        if (bonus.type === BonusTypes.INSTANT) {
          await this.bonusBalanceService.createMany(
            balance,
            transactionManager,
          );
        }
      });
      for (const p of progress) {
        if (bonus.type === BonusTypes.INSTANT) {
          await this.bonusNotificationService.notifyOnBonusReceived({
            userId,
            amount: decimalToDollarsValue(
              new Decimal(p.rewardAmount.toString()),
            ),
            bonusName: bonus.name,
          });
        }
        if (bonus.type === BonusTypes.PROGRESS) {
          await this.bonusNotificationService.notifyRolloverStart({
            userId,
            reward: decimalToDollarsValue(
              new Decimal(p.rewardAmount.toString()),
            ),
            rollover: decimalToDollarsValue(
              new Decimal(p.targetProgress.toString()),
            ),
            bonusName: bonus.name,
          });
        }
      }
      return progress;
    });
  }

  @Process(JOB.BONUS_HANDLE_DEPOSIT)
  async processDeposit(job: Job<UserDepositEvent>): Promise<void> {
    const event = job.data;

    // Invalidate welcome bonus progression if user has more than 1 deposits
    const depositTransactionsCount = await this.prismaService.transaction.count(
      {
        where: {
          user: {
            id: event.userId,
          },
          counterParty: TransactionCounterParties.DEPOSIT_SERVICE,
        },
      },
    );
    if (depositTransactionsCount > 1) {
      await this.prismaService.$queryRaw(Prisma.sql`
        UPDATE user_bonus_progressions
        SET 
          expires_at = DATE_TRUNC('day', NOW()),
          status = ${BonusProgressStatuses.FAILED}
        WHERE user_id = ${event.userId}
        AND EXISTS (
          SELECT 1
          FROM bonus_trigger_producer_configs AS config
          WHERE config.bonus_id = user_bonus_progressions.bonus_id
          AND config.target = ${BonusTriggerTargets.WELCOME}
        )
        AND target_progress > current_progress;
      `);
    }

    await this.producerEventHandler
      .handleEvent({
        event,
        type: BonusTriggerConfigTypes.DEPOSIT,
        userId: event.userId,
      })
      .catch((e) => {
        Logger.error(
          {
            message: e.message,
            stack: e.stack,
          },
          'BonusJobConsumer.onDeposit',
        );
      });
  }

  getRakebackPercentage(rake: number): number {
    if (rake >= 10 && rake < 150) {
      return 0.2;
    }
    if (rake >= 150 && rake < 350) {
      return 0.25;
    }
    if (rake >= 350 && rake < 650) {
      return 0.35;
    }
    if (rake >= 650 && rake < 950) {
      return 0.4;
    }
    if (rake >= 950) {
      return 0.45;
    }
    return 0;
  }

  @Process(JOB.BONUS_RAKEBACK)
  async processRakeback(job: Job<BonusRakebackJobData>): Promise<void> {
    this.asyncLogService.init(async () => {
      this.asyncLogService.log({ data: job.data }, 'BonusRakeback.process');

      const userRoles = await this.roleService.getUserRoles(job.data.userId);
      if (userRoles.some((role) => role.name === Roles.VIP_USER)) {
        const isBonusEnabled = await this.userConfigService.isUserBonusEnabled(
          job.data.userId,
        );

        if (!isBonusEnabled) {
          this.asyncLogService.log(
            { data: job.data },
            'BonusRakeback.process.vipUserNotAllowed',
          );
          return;
        }
      }

      const bonusAmount =
        job.data.totalRake *
        this.getRakebackPercentage(job.data.totalRake) *
        this.configService.getOrThrow(ENV.USD_POINTS);

      await this.prismaService.$transaction(async (transactionManager) => {
        await transactionManager.userBonusProgression.create({
          data: {
            bonusId: job.data.bonusId,
            userId: job.data.userId,
            rewardAmount: bonusAmount,
            currentProgress: 0,
            targetProgress: 0,
            status: BonusProgressStatuses.COMPLETED,
            claimedAt: DateTime.now().toJSDate(),
          },
        });

        await transactionManager.userBonusBalance.create({
          data: {
            bonusId: job.data.bonusId,
            userId: job.data.userId,
            balance: bonusAmount,
          },
        });
      });

      this.asyncLogService.log(
        { bonusAmount },
        'BonusRakeback.process.bonusAmount',
      );

      this.bonusNotificationService.notifyOnBonusReceived({
        userId: job.data.userId,
        amount: decimalToDollarsValue(new Decimal(bonusAmount)),
        bonusName: job.data.bonusName,
      });

      if (job.data.totalRake < 500) {
        return;
      }

      const pokerCode = await this.prismaService.$transaction(
        async (transactionManager) => {
          const foundPokerCode = await transactionManager.$queryRaw<
            { id: number; code: string }[]
          >(Prisma.sql`
            WITH code_usage AS (
              SELECT 
                p.id AS poker_code_id,
                COUNT(d.code_id) FILTER (WHERE d.user_id <> ${job.data.userId}) AS total_distributions
              FROM 
                poker_codes p
              LEFT JOIN 
                poker_code_distributions d
              ON 
                p.id = d.code_id
              GROUP BY 
                p.id
            ),
            available_codes AS (
              SELECT 
                p.id AS poker_code_id
              FROM 
                poker_codes p
              INNER JOIN 
                code_usage cu
              ON 
                p.id = cu.poker_code_id
              WHERE 
                p.is_high_roller = TRUE
                AND cu.total_distributions < p.use_limit
                AND NOT EXISTS (
                  SELECT 1
                  FROM poker_code_distributions d
                  WHERE 
                    d.code_id = p.id 
                    AND d.user_id = ${job.data.userId}
                    AND d.distribution_count >= p.reuse_limit
                )
            )
            SELECT 
              p.id,
              p.code
            FROM 
              poker_codes p
            INNER JOIN 
              available_codes ac
            ON 
              p.id = ac.poker_code_id
            ORDER BY 
              p.created_at ASC
            LIMIT 1;
          `);

          if (foundPokerCode.length === 0) {
            return;
          }

          await transactionManager.pokerCodeDistribution.upsert({
            where: {
              userId_codeId: {
                userId: job.data.userId,
                codeId: foundPokerCode[0].id,
              },
            },
            create: {
              userId: job.data.userId,
              codeId: foundPokerCode[0].id,
              distributionCount: 1,
            },
            update: {
              distributionCount: {
                increment: 1,
              },
            },
          });

          return foundPokerCode[0];
        },
      );

      if (!pokerCode) {
        return;
      }

      this.asyncLogService.log(
        { userId: job.data.userId, pokerCode },
        'BonusRakeback.process.highrollerPokerCodeDistributed',
      );

      this.notificationService.createNotification(
        job.data.userId,
        NotificationCodes.POKER_CODE_DISTRIBUTED,
        undefined,
        {
          pokerCodes: pokerCode.code,
        },
      );
    });
  }
}
