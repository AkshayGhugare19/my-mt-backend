import { Injectable } from '@nestjs/common';

@Injectable()
export class DeadlockGuard {
  constructor() {}

  async retryOnDeadlock<T>(
    fn: () => Promise<T>,
    maxAttempts = 5,
    delay = 100,
    maxDelay = 5000,
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        if (error.code !== '40P01') {
          throw error;
        }
        attempt += 1;
        if (attempt >= maxAttempts) {
          throw error;
        }
        const newDelay =
          Math.min(delay * 2 ** attempt, maxDelay) +
          Math.floor(Math.random() * 1001);
        await new Promise((resolve) => setTimeout(resolve, newDelay));
      }
    }
    throw new Error('Unreachable');
  }
}
