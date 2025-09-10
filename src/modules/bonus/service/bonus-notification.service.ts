import { NotificationCodes } from '@infrastructure/database/prisma/constants';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';

@Injectable()
export class BonusNotificationService {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly asyncLogService: AsyncLogService,
  ) {}

  async notifyOnBonusReceived(params: {
    userId: string;
    amount: number;
    bonusName: string;
  }): Promise<Notification | null> {
    const { amount, bonusName, userId } = params;
    return await this.notificationsService
      .createNotification(userId, NotificationCodes.BONUS_RECEIVED, undefined, {
        amount,
        bonusName,
      })
      .catch((e) => {
        this.asyncLogService.log(
          { userId, error: e },
          'CashbackJobConsumer.createNotification.error',
        );
        return null;
      });
  }

  async notifyRolloverStart(params: {
    userId: string;
    reward: number;
    rollover: number;
    bonusName: string;
  }): Promise<Notification | null> {
    const { reward, rollover, bonusName, userId } = params;
    return await this.notificationsService
      .createNotification(
        userId,
        NotificationCodes.BONUS_ROLLOVER_STARTED,
        { amount: reward },
        { bonusName, rollover, amount: reward },
      )
      .catch((e) => {
        this.asyncLogService.log(
          { userId, error: e },
          'CashbackJobConsumer.createNotification.error',
        );
        return null;
      });
  }
}
