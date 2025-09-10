import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { BonusProgressStatuses } from '@modules/bonus/enum';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { BonusProgressionService } from '@modules/bonus/service/bonus-progression.service';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UserBonusProgression } from '@prisma/client';

@Injectable()
export class WageringProgressCronProducer {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly betProgressService: BonusProgressionService,
    private readonly logService: AsyncLogService,
  ) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async runFailBonusWageringProgress(): Promise<void> {
    let cursor: string | undefined;
    for (let i = 0; i < 100; i++) {
      const bonusProgresses =
        await this.prismaService.userBonusProgression.findMany({
          where: {
            status: BonusProgressStatuses.PENDING,
            deletedAt: null,
            bonusBalanceId: null,
            bonus: {
              withdrawAfterRollover: true,
            },
          },
          skip: cursor ? 1 : 0,
          cursor: cursor ? { id: cursor } : undefined,
          take: 1000,
        });

      if (bonusProgresses.length === 0) {
        break;
      }

      cursor = bonusProgresses.at(-1)?.id;
      await Promise.all(
        bonusProgresses.map(async (bonusProgress) => {
          await this.failBonusWageringProgress(bonusProgress);
        }),
      );
    }
  }

  async failBonusWageringProgress(
    bonusProgress: UserBonusProgression,
  ): Promise<void> {
    const unsettledBetsWithTargetTip =
      await this.betProgressService.findUnsettledBetWithBonusProgress(
        bonusProgress,
      );

    if (unsettledBetsWithTargetTip > 0) {
      this.logService.log({
        message: `Bonus wagering progress with id ${bonusProgress.id} has ${unsettledBetsWithTargetTip} unsettled bets with target tip`,
        context: 'WageringProgressCronProducer.failBonusWageringProgress',
      });
      return;
    }

    await this.prismaService.userBonusProgression.update({
      where: { id: bonusProgress.id },
      data: { status: BonusProgressStatuses.FAILED },
    });
  }
}
