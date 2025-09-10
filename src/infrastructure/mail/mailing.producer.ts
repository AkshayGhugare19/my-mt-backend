import { JOB } from '@infrastructure/queue/bull/constants/job';
import {
  SendForgotPasswordMailJobData,
  SendTwoFactorAuthenticationCodeMailJobData,
  SendVerificationMailJobData,
} from '@infrastructure/queue/bull/constants/job-data';
import { BULL_QUEUE } from '@infrastructure/queue/bull/constants/queue';
import { defaultJobConfig } from '@infrastructure/queue/bull/queue-config';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bull';

@Injectable()
export class MailingProducer {
  constructor(
    @InjectQueue(BULL_QUEUE.MAILS_QUEUE)
    private readonly mailsQueue: Queue,
  ) {}

  enqueueSendForgotPasswordMailJob(
    data: SendForgotPasswordMailJobData,
  ): Promise<Job> {
    return this.mailsQueue.add(JOB.SEND_FORGOT_PASSWORD_MAIL, data, {
      attempts: 3,
      ...defaultJobConfig,
    });
  }

  enqueueSendVerifyEmailMailJob(
    data: SendVerificationMailJobData,
  ): Promise<Job> {
    return this.mailsQueue.add(JOB.SEND_VERIFY_EMAIL_MAIL, data, {
      attempts: 3,
      ...defaultJobConfig,
    });
  }

  enqueueSendTwoFactorAuthenticationCodeMailJob(
    data: SendTwoFactorAuthenticationCodeMailJobData,
  ): Promise<Job> {
    return this.mailsQueue.add(
      JOB.SEND_TWO_FACTOR_AUTHENTICATION_CODE_MAIL,
      data,
      {
        attempts: 3,
        ...defaultJobConfig,
      },
    );
  }
}
