import { JOB } from '@infrastructure/queue/bull/constants/job';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { PokerCodesService } from '@modules/poker-codes/service/poker-codes.service';
import { UserDepositEvent } from '@modules/transaction-ledger/event/user-deposit.event';
import {
  OnQueueCompleted,
  OnQueueFailed,
  Process,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { decimalToDollarsValue } from '@utils/decimal-to-dollar-value';
import { Job } from 'bull';

@Processor(QueuesDefinition.POKER_CODE_DISTRIBUTION_QUEUE.name ?? '')
export class PokerCodeJobConsumer {
  private readonly _logger = new Logger(PokerCodeJobConsumer.name);
  constructor(private readonly pokerCodesService: PokerCodesService) {}

  @OnQueueCompleted()
  public onComplete(job: Job): any {
    this._logger.debug(`Completed job ${job.id} of type ${job.name}`);
  }

  @OnQueueFailed()
  public onError(job: Job<any>, error: any): any {
    this._logger.error(
      `Failed job ${job.id} of type ${job.name}: ${error.message}`,
      error.stack,
    );
  }

  @Process(JOB.POKER_CODE_DISTRIBUTION)
  async processPokerCodeDistribution(
    job: Job<UserDepositEvent>,
  ): Promise<void> {
    try {
      this._logger.log({ data: job.data }, 'PokerCodeDistribution.init');

      const event = job.data;

      const usdAmount = decimalToDollarsValue(new Decimal(event.pointsAmount));

      const eligiblePokerCodes =
        await this.pokerCodesService.assignPokerCodesOnDeposit(
          event.userId,
          usdAmount,
        );

      if (eligiblePokerCodes.length) {
        await this.pokerCodesService.pokerCodesDistributedNotification(
          event.userId,
          eligiblePokerCodes,
        );
      }

      this._logger.log({ eligiblePokerCodes }, 'PokerCodeDistribution.done');
    } catch (e) {
      this._logger.error({ error: e }, 'PokerCodeDistribution.error');
    }
  }
}
