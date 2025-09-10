import { OnEvents } from '@common/decorators/on-events.decorator';
import { EventNamespace } from '@infrastructure/event/namespace';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import { BULL_QUEUE } from '@infrastructure/queue/bull/constants/queue';
import { defaultJobConfig } from '@infrastructure/queue/bull/queue-config';
import { UserDepositEvent } from '@modules/transaction-ledger/event/user-deposit.event';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';

@Injectable()
export class PokerCodeJobProducer {
  constructor(
    @InjectQueue(BULL_QUEUE.POKER_CODE_DISTRIBUTION_QUEUE)
    private readonly queue: Queue,
  ) {}

  @OnEvents([EventNamespace.USER_DEPOSIT])
  async onDeposit(event: UserDepositEvent): Promise<void> {
    this.queue.add(JOB.POKER_CODE_DISTRIBUTION, event, {
      attempts: 2,
      backoff: 1000,
      ...defaultJobConfig,
    });
  }
}
