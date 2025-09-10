import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { CreatePushSubscriptionDto } from '../dto/create-push-subscription.dto';
import { Prisma, PushSubscription } from '@prisma/client';
import * as webpush from 'web-push';
import { SendRoleNotificationParams, SendUsersNotificationParams } from '@modules/notifications/push-subscription/types';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';

@Injectable()
export class PushSubscriptionService {
  private readonly logger = new Logger(PushSubscriptionService.name);
  private readonly notificationTag = this.configService.get(ENV.PUSH_NOTIFICATION_TAG);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Configure VAPID keys for web-push
    const vapidPublicKey = this.configService.getOrThrow(ENV.PUSH_NOTIFICATION_VAPID_PUBLIC_KEY);
    const vapidPrivateKey = this.configService.getOrThrow(ENV.PUSH_NOTIFICATION_VAPID_PRIVATE_KEY);
    const mailto = this.configService.getOrThrow(ENV.MAILING_DOMAIN);

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(
        `mailto:${mailto}`,
        vapidPublicKey,
        vapidPrivateKey
      );
    } else {
      this.logger.warn('VAPID keys not configured. Push notifications will not work properly.');
    }
  }

  async createSubscription(userId: string, createDto: CreatePushSubscriptionDto): Promise<PushSubscription> {
    try {
      // First, check if this endpoint exists for other users
      const existingSubscriptions = await this.prisma.pushSubscription.findMany({
        where: {
          endpoint: createDto.endpoint,
          isActive: true
        },
        include: { user: { select: { id: true, nickname: true } } }
      });

      // Log potential device sharing
      if (existingSubscriptions.length > 0) {
        const otherUsers = existingSubscriptions.filter(sub => sub.userId !== userId);
        if (otherUsers.length > 0) {
          this.logger.warn(`Device sharing detected. Endpoint ${createDto.endpoint} is used by multiple users:`,
            otherUsers.map(sub => ({ userId: sub.userId, nickname: sub.user.nickname }))
          );
        }
      }
      return this.prisma.$transaction(async (tx) => {
        const findSubscription = await tx.pushSubscription.findFirst({
          where: {
            userId,
            endpoint: createDto.endpoint
          }
        });

        if (findSubscription) {
          return tx.pushSubscription.update({
            where: { id: findSubscription.id },
            data: {
              isActive: true,
              p256dh: createDto.p256dh,
              auth: createDto.auth,
              userAgent: createDto.userAgent,
              updatedAt: new Date(),
            }
          })
        }
        const subscription = await tx.pushSubscription.create({
          data: {
            userId,
            endpoint: createDto.endpoint,
            p256dh: createDto.p256dh,
            auth: createDto.auth,
            userAgent: createDto.userAgent,
          },
        });

        // Deactivate all other subscriptions for this endpoint
        await tx.pushSubscription.updateMany({
          where: {
            userId: { not: userId },
            endpoint: createDto.endpoint
          },
          data: { isActive: false },
        });
        return subscription;
      })
    } catch (error) {
      this.logger.error('Failed to create push subscription', error);
      throw error;
    }
  }

  async removeSubscription(userId: string, endpoint: string): Promise<{ message: string }> {
    const subscription = await this.prisma.pushSubscription.findFirst({
      where: {
        userId,
        endpoint,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Push subscription not found');
    }

    await this.prisma.pushSubscription.update({
      where: { id: subscription.id },
      data: { isActive: false },
    });

    return { message: 'Push subscription removed successfully' };
  }

  async removeAllSubscriptions(userId: string): Promise<{ message: string }> {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId },
    });
    return { message: 'All push subscriptions removed successfully' };
  }

  async getUserSubscriptions(userId: string): Promise<Partial<PushSubscription>[]> {
    return this.prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        endpoint: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async sendNotification(sendDto: SendUsersNotificationParams | SendRoleNotificationParams): Promise<{
    sent: number;
    failed: number;
    totalSubscriptions?: number;
    failedSubscriptions?: string[];
  }> {
    try {
      // Get subscriptions to send to
      const whereCondition: Prisma.PushSubscriptionWhereInput = 'userIds' in sendDto
        ? { userId: { in: sendDto.userIds }, isActive: true }
        : { isActive: true, user: { userRoles: { some: { role: { name: sendDto.role } } } } };

      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: whereCondition
      });

      if (subscriptions.length === 0) {
        this.logger.warn('No active subscriptions found to send notification to');
        return { sent: 0, failed: 0 };
      }

      const notificationPayload = JSON.stringify({
        title: sendDto.title,
        body: sendDto.message,
        timestamp: Date.now(),
        tag: this.notificationTag,
        url: sendDto.url,
      });

      let sent = 0;
      let failed = 0;
      const failedSubscriptions: string[] = [];

      // Send notifications in parallel
      const sendPromises = subscriptions.map(async (subscription: PushSubscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            notificationPayload,
          );
          sent++;
        } catch (error: any) {
          failed++;
          failedSubscriptions.push(subscription.id);
          this.logger.error(`Failed to send notification to subscription ${subscription.id}`, error);

          // If the subscription is invalid, deactivate it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await this.prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { isActive: false },
            });
            this.logger.log(`Deactivated invalid subscription ${subscription.id}`);
          }
        }
      });

      await Promise.all(sendPromises);

      this.logger.log(`Push notification sent: ${sent} successful, ${failed} failed`);

      return {
        sent,
        failed,
        totalSubscriptions: subscriptions.length,
        failedSubscriptions,
      };
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
      throw error;
    }
  }

  async getAllSubscriptions(): Promise<(PushSubscription & { user: { id: string; nickname: string | null; email: string | null } })[]> {
    return this.prisma.pushSubscription.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSubscriptionStats(): Promise<{ total: number; active: number; inactive: number }> {
    const [total, active, inactive] = await Promise.all([
      this.prisma.pushSubscription.count(),
      this.prisma.pushSubscription.count({ where: { isActive: true } }),
      this.prisma.pushSubscription.count({ where: { isActive: false } }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }
}
