import { Logger } from '@nestjs/common';
import { BucketService } from '../services';
import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import { Job } from 'bull';
import { BULL_QUEUE } from '@infrastructure/queue/bull/constants/queue';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';

@Processor(BULL_QUEUE.MEDIA_QUEUE)
export class MediaConsumer {
  constructor(
    private readonly bucketService: BucketService,
    private readonly prisma: PrismaService,
  ) {}

  @OnQueueFailed()
  async onQueueFailed(job: Job, error: Error): Promise<void> {
    Logger.error(
      {
        errorMessage: error.message,
        userId: job.data.userId,
        imagePath: job.data.imagePath,
      },
      'Media Consumer Error',
    );
  }

  @Process(JOB.DELETE_USER_IMAGE)
  async deleteUserImage(
    job: Job<{ userId: string; mediaId: string }>,
  ): Promise<void> {
    const media = await this.prisma.media.findUnique({
      where: {
        id: job.data.mediaId,
      },
    });

    if (!media) {
      return;
    }

    const deletedFile = await this.bucketService.deleteFile(media.path);

    if (!deletedFile) {
      throw new Error('Failed to delete file');
    }

    await this.prisma.$transaction([
      this.prisma.media.delete({
        where: {
          id: job.data.mediaId,
        },
      }),
      this.prisma.user.update({
        where: {
          id: media.entityId,
        },
        data: {
          avatar: null,
        },
      }),
    ]);
  }
}
