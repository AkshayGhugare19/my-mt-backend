import { ENV } from '@common/env';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { BonusProgressStatuses } from '@modules/bonus/enum';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BonusCronService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireUserBonusProgression(): Promise<void> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      return;
    }
    await this.prismaService.userBonusProgression.updateMany({
      where: {
        status: BonusProgressStatuses.PENDING,
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        status: BonusProgressStatuses.FAILED,
      },
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireUserBonusBalance(): Promise<void> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      return;
    }
    await this.prismaService.userBonusBalance.deleteMany({
      where: {
        bonusProgression: {
          expiresAt: {
            lte: new Date(),
          },
        }
      },
    });
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async deleteZeroBalance(): Promise<void> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      return;
    }
    await this.prismaService.userBonusBalance.deleteMany({
      where: {
        balance: {
          lte: 0,
        },
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteOldLogs(): Promise<void> {
    if (this.configService.get(ENV.DISABLE_BONUS_SYSTEM)) {
      return;
    }
    await this.prismaService.bonusEventLog.deleteMany({
      where: {
        createdAt: {
          lt: new Date(new Date().setDate(new Date().getDate() - 7)),
        },
      },
    });
  }
}
