import { ErrorMessages } from '@common/enums/error-messages.enum';
import { ENV } from '@common/env';
import { NotFoundError } from '@common/error/not-found.error';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { BucketService } from '@modules/media/services/bucket';
import { REDIS_CACHE_KEY_DEFAULT_PROFILE_IMAGES } from '@modules/user/constants';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Avatar } from '@prisma/client';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class AdminAvatarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bucketService: BucketService,
    private readonly config: ConfigService,
    @InjectRedis()
    private readonly redisService: Redis,
  ) {}

  async getAllAvatars(): Promise<Avatar[]> {
    return this.prisma.avatar.findMany({
      orderBy: {
        order: 'asc',
      },
    });
  }

  async uploadNewAvatars(
    files: Express.Multer.File[],
  ): Promise<(Avatar & { originalName: string | undefined })[]> {
    const uploadedFiles: {
      url: string;
      order: number;
      originalName: string;
    }[] = [];

    let order = 1;
    for (const avatar of files) {
      const id = uuidV4();
      const path = `${this.config.getOrThrow(ENV.SPACES_DEFAULT_AVATARS_PATH)}/${id}.${avatar.originalname.split('.').pop()}`;
      const url = await this.bucketService
        .uploadToPath(path, avatar.buffer, {
          ACL: 'public-read',
        })
        .catch((error) => {
          Logger.error(error, 'AvatarService: uploadNewAvatars');
          return null;
        });
      if (url) {
        uploadedFiles.push({
          url,
          order: order++,
          originalName: avatar.originalname,
        });
      }
    }

    const savedAvatars = await this.prisma.$transaction(async (tx) => {
      await tx.avatar.updateMany({
        data: {
          order: {
            increment: uploadedFiles.length,
          },
        },
      });
      return await tx.avatar.createManyAndReturn({
        data: uploadedFiles.map((file) => ({
          order: file.order,
          url: file.url,
        })),
      });
    });
    await this.redisService.del(REDIS_CACHE_KEY_DEFAULT_PROFILE_IMAGES);

    return savedAvatars.map((avatar) => ({
      ...avatar,
      originalName: uploadedFiles.find((file) => file.order === avatar.order)
        ?.originalName,
    }));
  }

  async updateOrder(id: number, newOrder: number): Promise<Avatar> {
    const oldAvatar = await this.prisma.avatar.findUnique({
      where: { id },
    });

    if (!oldAvatar) {
      throw new NotFoundError(ErrorMessages.NOT_FOUND, 'Avatar', id.toString());
    }

    const currentOrder = oldAvatar.order;

    if (currentOrder === newOrder) {
      return oldAvatar;
    }

    const res = await this.prisma.$transaction(async (tx) => {
      if (currentOrder < newOrder) {
        // Move down: decrement order of avatars between currentOrder and newOrder
        await tx.avatar.updateMany({
          where: {
            order: {
              gt: currentOrder,
              lte: newOrder,
            },
          },
          data: {
            order: {
              decrement: 1,
            },
          },
        });
      } else {
        // Move up: increment order of avatars between newOrder and currentOrder
        await tx.avatar.updateMany({
          where: {
            order: {
              gte: newOrder,
              lt: currentOrder,
            },
          },
          data: {
            order: {
              increment: 1,
            },
          },
        });
      }

      // Update the order of the specified avatar
      return await tx.avatar.update({
        where: { id },
        data: { order: newOrder },
      });
    });
    await this.redisService.del(REDIS_CACHE_KEY_DEFAULT_PROFILE_IMAGES);
    return res;
  }

  async deleteAvatar(id: number): Promise<void> {
    const avatar = await this.prisma.avatar.findUnique({
      where: {
        id,
      },
    });
    if (!avatar) {
      throw new NotFoundError(ErrorMessages.NOT_FOUND, 'Avatar', id.toString());
    }
    const extractedPath = avatar.url
      .split(this.config.getOrThrow(ENV.SPACES_DEFAULT_AVATARS_PATH))
      .pop();

    if (!extractedPath) {
      Logger.error({
        message: 'AvatarService: deleteAvatar',
        extractedPath,
        url: avatar.url,
      });
      throw new InternalServerErrorException();
    }

    await this.bucketService.deleteFile(extractedPath);
    await this.prisma.avatar.delete({
      where: {
        id,
      },
    });
    await this.prisma.user.updateMany({
      where: {
        avatar: avatar.url,
      },
      data: {
        avatar: null,
      },
    });
    await this.redisService.del(REDIS_CACHE_KEY_DEFAULT_PROFILE_IMAGES);
  }
}
