import { JOB } from '@infrastructure/queue/bull/constants/job';
import { BULL_QUEUE } from '@infrastructure/queue/bull/constants/queue';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bull';

@Injectable()
export class MediaProducer {
  constructor(
    @InjectQueue(BULL_QUEUE.MEDIA_QUEUE)
    private readonly mediaQueue: Queue,
  ) {}

  async deleteUserImage(
    userId: string,
    mediaId: string,
  ): Promise<
    Job<{
      userId: string;
      imagePath: string;
    }>
  > {
    return this.mediaQueue.add(
      JOB.DELETE_USER_IMAGE,
      {
        userId,
        mediaId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 1000,
        },
      },
    );
  }
}
