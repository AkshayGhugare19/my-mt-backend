import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { BONUS_ASYNC_LOCAL_STORAGE_PROVIDER } from '@modules/bonus/constants';
import { BonusAsyncLocalStorage } from '@modules/bonus/types';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';

@Injectable()
export class AsyncLogService implements OnModuleInit {
  private isEnabled = false;
  constructor(
    @Inject(BONUS_ASYNC_LOCAL_STORAGE_PROVIDER)
    private readonly als: BonusAsyncLocalStorage,
    private readonly prismaService: PrismaService,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async onModuleInit(): Promise<void> {
    this.isEnabled = await this.redis
      .get('async-logging')
      .then((v) => v === 'true');
  }

  async toggleLogging(value: boolean): Promise<void> {
    await this.redis.set('async-logging', value ? 'true' : 'false');
    this.isEnabled = value;
  }

  async init<T>(cb: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) {
      return cb();
    }
    return this.als
      .run({ logs: [] }, async () => {
        try {
          return await cb();
          // eslint-disable-next-line sonarjs/no-useless-catch, no-useless-catch
        } catch (error) {
          throw error;
        } finally {
          const store = this.als.getStore();

          if (store) {
            this.prismaService.bonusEventLog
              .create({
                data: { data: JSON.stringify(store.logs) },
                select: {
                  id: true,
                },
              })
              .catch((e) => {
                Logger.error(e, 'AsyncLogService.saveLogs');
              });
          }
        }
      })
      .finally(() => {});
  }

  isInContext(): boolean {
    if (!this.isEnabled) return true;
    return !!this.als.getStore();
  }

  log(data: Record<string, any>, ctx?: string): void {
    if (!this.isEnabled) {
      return;
    }

    const store = this.als.getStore();
    if (store) {
      if (ctx) {
        store.logs.push({ ctx, data });
      } else {
        store.logs.push(data);
      }
    }
  }
}
