import { JOB } from '@infrastructure/queue/bull/constants/job';
import {
  ProcessWageringBetCompletedJobData,
  ProcessWageringProgressJobData,
} from '@infrastructure/queue/bull/constants/job-data';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';

@Injectable()
export class WageringProgressProducer {
  constructor(
    @InjectQueue(QueuesDefinition.WAGERING_PROGRESS_QUEUE.name)
    private readonly wageringProgressStatusQueue: Queue,
  ) {}

  async addProcessWagerProgress(
    data: ProcessWageringProgressJobData,
  ): Promise<void> {
    await this.wageringProgressStatusQueue.add(
      JOB.BONUS_WAGERING_PROGRESS,
      data,
      {
        attempts: 1,
      },
    );
  }

  async addProcessWagerBetCompleted(
    data: ProcessWageringBetCompletedJobData,
  ): Promise<void> {
    await this.wageringProgressStatusQueue.add(
      JOB.BONUS_WAGERING_BET_COMPLETED,
      data,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 100,
        },
      },
    );
  }
}
