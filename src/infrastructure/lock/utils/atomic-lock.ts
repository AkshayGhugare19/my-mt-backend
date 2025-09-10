import { ConflictException, Injectable, Logger } from '@nestjs/common';
import Redlock, { Settings } from 'redlock';

@Injectable()
export class AtomicLock {
  constructor(private readonly redlock: Redlock) {}

  async withLockGuard<T>(
    callback: () => Promise<T>,
    {
      lockDuration,
      lockKey,
      options,
      context,
      conflictErrorMessage,
      logError = true,
      releaseOnFail = true,
      releaseOnComplete = true,
    }: {
      lockKey: string[];
      lockDuration: number;
      options?: Partial<Settings>;
      context?: string;
      conflictErrorMessage: string;
      logError?: boolean;
      releaseOnFail?: boolean;
      releaseOnComplete?: boolean;
    },
  ): Promise<T> {
    let lock = null;

    try {
      lock = await this.redlock.acquire(lockKey, lockDuration, options);
    } catch (error) {
      throw new ConflictException(conflictErrorMessage);
    }

    try {
      const result = await callback();
      if (lock && releaseOnComplete) {
        await lock.release();
      }
      return result;
    } catch (error) {
      if (logError) {
        Logger.error(
          {
            message: error.message,
            stack: error.stack,
          },
          context || 'withLockGuard',
        );
      }
      if (lock && releaseOnFail) {
        await lock.release();
      }
      throw error;
    }
  }
}
