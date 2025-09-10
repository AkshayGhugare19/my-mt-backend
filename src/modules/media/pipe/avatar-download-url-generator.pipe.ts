import { ONE_DAY_IN_SECONDS } from '@common/constants';
import { REDIS_CACHE_KEY_AVATAR_DOWNLOAD_URL } from '@modules/media/constants';
import { AVATAR_IMAGE } from '@modules/media/decorator/avatar-image.decorator';
import { BucketService } from '@modules/media/services';
import { Injectable, PipeTransform, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class AvatarDownloadUrlGeneratorPipe implements PipeTransform {
  constructor(
    private readonly bucketService: BucketService,
    private readonly reflector: Reflector,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async transform(value: unknown): Promise<unknown> {
    if (typeof value !== 'object' || value === null || value === undefined) {
      return value;
    }

    const hasAvatar = this.reflector.get(
      AVATAR_IMAGE,
      value as Type<{ avatar: string | null }>,
    );

    if (!hasAvatar) {
      return value;
    }

    const avatar = (value as { avatar: string | null }).avatar;

    if (!avatar) {
      return value;
    }

    if (avatar.startsWith('http')) {
      return value;
    }

    const cachedUrl = await this.redis.get(
      `${REDIS_CACHE_KEY_AVATAR_DOWNLOAD_URL}:${avatar}`,
    );

    if (cachedUrl) {
      (value as { avatar: string }).avatar = cachedUrl;
      return value;
    }

    const downloadUrl = await this.bucketService.getPresignedUrl(avatar);

    await this.redis.set(
      `${REDIS_CACHE_KEY_AVATAR_DOWNLOAD_URL}:${avatar}`,
      downloadUrl,
      'EX',
      ONE_DAY_IN_SECONDS,
    );

    return { ...value, avatar: downloadUrl };
  }
}
