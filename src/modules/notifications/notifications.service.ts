import { Inject, forwardRef, Injectable } from '@nestjs/common';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { Role } from '@modules/role/enum/role.enum';
import { NotificationCode } from '@infrastructure/database/prisma/constants';
import { Notification } from '@prisma/client';
import { I18nService } from 'nestjs-i18n';
import {
  NotificationCodeToI18nMessage,
  NotificationCodeToI18nTitle,
  NotificationCodeToUrl,
} from './constants';
import { NotificationDto } from './dto/notification.dto';
import { Wrapper } from '@common/types';
import { PushSubscriptionService } from '@modules/notifications/push-subscription/service/push-subscription.service';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(forwardRef(() => RealtimeService))
    private readonly realtimeService: Wrapper<RealtimeService>,
    private readonly prismaService: PrismaService,
    private readonly i18nService: I18nService,
    private readonly pushSubscriptionService: PushSubscriptionService,
  ) {}

  async createNotification(
    userId: string,
    code: NotificationCode,
    titleArgs?: object,
    messageArgs?: object,
  ): Promise<Notification> {
    const notification = await this.prismaService.notification.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
        code,
        titleArgs,
        messageArgs,
      },
    });

    this.realtimeService.pushMessageToUser(userId, {
      type: 'notification',
      id: notification.id,
    });

    return notification;
  }

  async createNotificationsForRole(
    role: Role,
    code: NotificationCode,
    titleArgs?: object,
    messageArgs?: object,
  ): Promise<void> {
    const users = await this.prismaService.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              name: role,
            },
          },
        },
      },
    });

    await this.prismaService.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        code,
        titleArgs,
        messageArgs,
      })),
    });

    this.realtimeService.pushMessageToRole(role, {
      type: 'notification',
    });

    this.pushSubscriptionService.sendNotification({
      userIds: users.map((user) => user.id),
      title: this.i18nService.translate(
        NotificationCodeToI18nTitle[code],
        {
          lang: 'en',
          args: titleArgs as { [k: string]: string },
        },
      ) as string,
      message: this.i18nService.translate(
        NotificationCodeToI18nMessage[code],
        {
          lang: 'en',
          args: messageArgs as { [k: string]: string },
        },
      ) as string,
      url: NotificationCodeToUrl[code],
    });
  }

  async getUnreadNotificationsCountForUser(userId: string): Promise<number> {
    return await this.prismaService.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async getNotificationsForUser(
    userId: string,
    page: number,
    limit: number,
    language: string,
  ): Promise<{
    total: number;
    data: NotificationDto[];
  }> {
    const total = await this.prismaService.notification.count({
      where: {
        userId,
      },
    });

    const notifications = await this.prismaService.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const translatedNotifications = notifications.map((notification) => {
      return {
        id: notification.id,
        code: notification.code,
        title: this.i18nService.translate(
          NotificationCodeToI18nTitle[notification.code],
          {
            lang: language,
            args: notification.titleArgs as { [k: string]: string },
          },
        ) as string,
        message: this.i18nService.translate(
          NotificationCodeToI18nMessage[notification.code],
          {
            lang: language,
            args: notification.messageArgs as { [k: string]: string },
          },
        ) as string,
        read: notification.read,
        createdAt: notification.createdAt,
      };
    });

    return {
      total,
      data: translatedNotifications,
    };
  }

  async readAllNotificationsForUser(userId: string): Promise<void> {
    await this.prismaService.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });
  }
}
