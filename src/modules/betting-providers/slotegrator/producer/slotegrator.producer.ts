import { JOB } from '@infrastructure/queue/bull/constants/job';
import { BULL_QUEUE } from '@infrastructure/queue/bull/constants/queue';
import { defaultJobConfig } from '@infrastructure/queue/bull/queue-config';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bull';
import {
  PlaceSportsBookBetInput,
  PlaceSportsBookBetResult,
} from '../service/slotegrator.service';

@Injectable()
export class SlotegratorProducer {
  constructor(
    @InjectQueue(BULL_QUEUE.SPORTSBOOK_BETS_QUEUE)
    private readonly sportsbookQueue: Queue,
  ) {}

  async enqueueSportsbookPlaceBetJob(
    data: PlaceSportsBookBetInput,
  ): Promise<Job<PlaceSportsBookBetResult>> {
    return await this.sportsbookQueue.add(JOB.SPORTSBOOK_PLACE_BET, data, {
      ...defaultJobConfig,
    });
  }
}
