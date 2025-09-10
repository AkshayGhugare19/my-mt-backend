import { USERS_BLACKLIST } from '@common/constants';
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { Redis } from 'ioredis';

@Injectable()
export class UserBlacklistService {
  constructor(
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async addToBlacklist(userIdOrPlayerTag: string): Promise<void> {
    await this.redis.hset(USERS_BLACKLIST, userIdOrPlayerTag, 'true');
  }

  async removeFromBlacklist(userIdOrPlayerTag: string): Promise<void> {
    await this.redis.hdel(USERS_BLACKLIST, userIdOrPlayerTag);
  }

  async isBlacklisted(userIdOrPlayerTag: string): Promise<boolean> {
    return !!(await this.redis.hget(USERS_BLACKLIST, userIdOrPlayerTag));
  }
}
