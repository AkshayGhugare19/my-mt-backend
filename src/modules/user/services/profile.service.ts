import { ONE_MINUTE_IN_SECONDS } from '@common/constants';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { BucketService, MediaProducer } from '@modules/media';
import { MediaEntityTypes, MediaTypes } from '@modules/media/constants';
import { REDIS_CACHE_KEY_DEFAULT_PROFILE_IMAGES } from '@modules/user/constants';
import { GeneratePresignedUrlDto } from '@modules/user/dto/generate-presigned-url.dto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Media } from '@prisma/client';
import { InjectRedis } from '@songkeys/nestjs-redis';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);
  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly bucketService: BucketService,
    private readonly mediaProducer: MediaProducer,
  ) {}

  async isDefaultImage(url: string): Promise<boolean> {
    const defaultProfileImage = await this.prisma.avatar.findFirst({
      where: {
        url,
      },
    });
    return !!defaultProfileImage;
  }

  async getUserUploadedAvatar(userId: string): Promise<Media | null> {
    const uploadedAvatars = await this.prisma.media.findFirst({
      where: {
        entityId: userId,
        entityType: MediaEntityTypes.USER,
        type: MediaTypes.USER_AVATAR,
      },
    });

    if (!uploadedAvatars) {
      return null;
    }

    return {
      ...uploadedAvatars,
    };
  }

  async getDefaultProfileImages(): Promise<string[]> {
    const cachedDefaultProfileImages = await this.redis.get(
      REDIS_CACHE_KEY_DEFAULT_PROFILE_IMAGES,
    );
    if (cachedDefaultProfileImages) {
      return JSON.parse(cachedDefaultProfileImages);
    }

    const defaultProfileImages = await this.prisma.avatar.findMany({
      orderBy: {
        order: 'asc',
      },
    });

    const defaultUrls = defaultProfileImages.map((avatar) => avatar.url);

    await this.redis.set(
      REDIS_CACHE_KEY_DEFAULT_PROFILE_IMAGES,
      JSON.stringify(defaultUrls),
      'EX',
      30 * ONE_MINUTE_IN_SECONDS,
    );
    return defaultUrls;
  }

  async getUploadPresignedUrl(
    userId: string,
    image: GeneratePresignedUrlDto,
  ): Promise<{ fileId: string; url: string }> {
    const id = 'asdasd';
    const filePath = `users/profile_avatars/${userId}/${id}.${image.fileName.split('.').pop()}`;

    const url = await this.bucketService.uploadWithPresignedUrl(
      filePath,
      image.checksum,
      image.mimetype,
      image.size,
    );

    return {
      fileId: id,
      url,
    };
  }

  async changeProfileImage(
    userId: string,
    image: string | Express.Multer.File,
  ): Promise<void> {
    const currentUserImageQuery = this.prisma
      .createQueryBuilder()
      .selectFrom('users as u')
      .select('u.avatar')
      .where('u.id', '=', userId)
      .where('u.deleted_at', 'is', null)
      .where('u.blocked_at', 'is', null)
      .innerJoin('media', (join) =>
        join
          .onRef('media.entity_id', '=', 'u.id')
          .on('media.type', '=', MediaTypes.USER_AVATAR)
          .on('media.entity_type', '=', MediaEntityTypes.USER),
      )
      .select('media.id as mediaId')
      .select('media.url as mediaUrl')
      .limit(1)
      .compile();
    const currentUserImage = await this.prisma.runQuery(currentUserImageQuery);

    await this.verifyDefaultImage(image, currentUserImage);

    if (currentUserImage?.length && typeof image !== 'string') {
      try {
        const addedJob = await this.mediaProducer.deleteUserImage(
          userId,
          currentUserImage[0].mediaId,
        );
        await addedJob.finished();
      } catch (error) {
        this.logger.error({
          message: 'Error deleting current user image',
          errorMessage: error.message,
          stack: error.stack,
          userId,
        });
        throw new InternalServerErrorException(
          ErrorMessages.SOMETHING_WENT_WRONG,
        );
      }
    }

    const newUrl =
      typeof image === 'string'
        ? image
        : await this.uploadNewImage(userId, image);

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: newUrl },
    });
  }

  private async uploadNewImage(
    userId: string,
    image: Express.Multer.File,
  ): Promise<string> {
    const id = uuidv4();

    const filePath = `users/profile_avatars/${userId}/${id}.${image.originalname.split('.').pop()}`;
    const url = await this.bucketService.uploadToPath(filePath, image.buffer, {
      ContentType: image.mimetype,
      ACL: 'public-read',
    });
    const media = await this.prisma.media.create({
      data: {
        url,
        path: filePath,
        entityId: userId,
        entityType: MediaEntityTypes.USER,
        type: MediaTypes.USER_AVATAR,
      },
    });
    return media.url;
  }

  private async verifyDefaultImage(
    image: string | Express.Multer.File,
    currentUserImages: { mediaId: string; mediaUrl: string }[],
  ): Promise<boolean> {
    if (typeof image !== 'string') {
      return true;
    }

    const isDefaultImage = await this.isDefaultImage(image);

    if (isDefaultImage) {
      return true;
    }

    if (currentUserImages.some((userImage) => userImage.mediaUrl === image)) {
      return true;
    }

    throw new BadRequestException(ValidationErrorMessages.INVALID_FILE_FORMAT);
  }
}
