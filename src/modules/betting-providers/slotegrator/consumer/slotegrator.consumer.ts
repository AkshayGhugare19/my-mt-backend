import { JOB } from '@infrastructure/queue/bull/constants/job';
import { BULL_QUEUE } from '@infrastructure/queue/bull/constants/queue';
import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  PlaceSportsBookBetInput,
  PlaceSportsBookBetResult,
  SlotegratorService,
} from '../service/slotegrator.service';
import { ErrorType } from '../error';

@Processor(BULL_QUEUE.SPORTSBOOK_BETS_QUEUE)
export class SlotegratorConsumer {
  constructor(private readonly slotegratorService: SlotegratorService) {}

  @Process(JOB.SPORTSBOOK_PLACE_BET)
  async processSportsbookPlaceBetJob(
    job: Job<PlaceSportsBookBetInput>,
  ): Promise<PlaceSportsBookBetResult> {
    try {
      return await this.slotegratorService.placeSportsBookBet(job.data);
    } catch (error) {
      Logger.error(
        {
          data: job?.data,
          message: error?.message,
          stack: error?.stack,
        },
        'SlotegratorConsumer.processSportsbookPlaceBetJob',
      );
      const errorCode =
        (error?.getErrorCode?.() as ErrorType) || 'INTERNAL_ERROR';
      throw new Error(errorCode);
    }
  }

  @OnQueueFailed({ name: JOB.SPORTSBOOK_PLACE_BET })
  async onFailedSportsbookPlaceBet(
    job: Job<PlaceSportsBookBetInput>,
    error: Error,
  ): Promise<void> {
    Logger.error(
      {
        data: job.data,
        message: error.message,
        stack: error.stack,
      },
      'SlotegratorConsumer.onError.processSportsbookPlaceBetJob',
    );
  }
}
