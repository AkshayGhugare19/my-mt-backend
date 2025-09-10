import { Module } from '@nestjs/common';
import { BucketService } from './services';
import { MediaProducer } from '@modules/media/job/producer';
import { MediaConsumer } from '@modules/media/job/consumer';
import { BullModule } from '@nestjs/bull';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue(QueuesDefinition.MEDIA_QUEUE),
  ],
  providers: [BucketService, MediaConsumer, MediaProducer],
  exports: [BucketService, MediaProducer],
})
export class MediaModule {}
