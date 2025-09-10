import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { MailingProducer } from '@infrastructure/mail/mailing.producer';
import { MailingConsumer } from '@infrastructure/mail/mailing.consumer';
import { MailingService } from '@infrastructure/mail/mailing.service';

@Module({
  imports: [BullModule.registerQueue(QueuesDefinition.MAILS_QUEUE)],
  providers: [MailingService, MailingProducer, MailingConsumer],
  exports: [MailingProducer],
})
export class MailingModule {}
