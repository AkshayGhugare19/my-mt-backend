import { JOB } from '@infrastructure/queue/bull/constants/job';
import { BULL_QUEUE } from '@infrastructure/queue/bull/constants/queue';
import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { MailingService } from './mailing.service';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ClientResponse } from '@sendgrid/mail';
import {
  SendForgotPasswordMailJobData,
  SendTwoFactorAuthenticationCodeMailJobData,
  SendVerificationMailJobData,
} from '@infrastructure/queue/bull/constants/job-data';

@Processor(BULL_QUEUE.MAILS_QUEUE)
export class MailingConsumer {
  constructor(private readonly mailingService: MailingService) {}

  @Process(JOB.SEND_FORGOT_PASSWORD_MAIL)
  async processSendForgotPasswordMailJob(
    job: Job<SendForgotPasswordMailJobData>,
  ): Promise<[ClientResponse, {}]> {
    return await this.mailingService.sendForgotPasswordMail(
      job.data.userEmail,
      job.data.userRole,
      job.data.code,
    );
  }

  @OnQueueFailed({ name: JOB.SEND_FORGOT_PASSWORD_MAIL })
  async onFailedResetPassword(
    job: Job<SendForgotPasswordMailJobData>,
    error: Error,
  ): Promise<void> {
    Logger.error(
      {
        data: job.data,
        message: error.message,
        stack: error.stack,
      },
      'MailingConsumer.onError.processSendForgotPasswordMailJob',
    );
  }

  @Process(JOB.SEND_VERIFY_EMAIL_MAIL)
  async processSendVerifyEmailMailJob(
    job: Job<SendVerificationMailJobData>,
  ): Promise<[ClientResponse, {}]> {
    return await this.mailingService.sendVerifyEmailMail(
      job.data.userEmail,
      job.data.code,
    );
  }

  @OnQueueFailed({ name: JOB.SEND_VERIFY_EMAIL_MAIL })
  async onFailedVerifyEmail(
    job: Job<SendForgotPasswordMailJobData>,
    error: Error,
  ): Promise<void> {
    Logger.error(
      {
        data: job.data,
        message: error.message,
        stack: error.stack,
      },
      'MailingConsumer.onError.processSendVerifyEmailMailJob',
    );
  }

  @Process(JOB.SEND_TWO_FACTOR_AUTHENTICATION_CODE_MAIL)
  async processTwoFactorAuthenticationCodeMailJob(
    job: Job<SendTwoFactorAuthenticationCodeMailJobData>,
  ): Promise<[ClientResponse, {}]> {
    return await this.mailingService.sendTwoFactorAuthenticationCodeMail(
      job.data.userEmail,
      job.data.code,
    );
  }

  @OnQueueFailed({ name: JOB.SEND_TWO_FACTOR_AUTHENTICATION_CODE_MAIL })
  async onFailedTwoFactorAuthenticationCodeMail(
    job: Job<SendTwoFactorAuthenticationCodeMailJobData>,
    error: Error,
  ): Promise<void> {
    Logger.error(
      {
        data: job.data,
        message: error.message,
        stack: error.stack,
      },
      'MailingConsumer.onError.processTwoFactorAuthenticationCodeMailJob',
    );
  }
}
