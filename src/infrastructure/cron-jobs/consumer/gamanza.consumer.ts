import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import { GamanzaRewardBonusJobData } from '@infrastructure/queue/bull/constants/job-data';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { BonusRewardTypes, BonusTriggerConfigTypes } from '@modules/bonus/enum';
import { ProducerEventHandler } from '@modules/bonus/handlers/producer-event-handler';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

@Processor(QueuesDefinition.GAMANZA_QUEUE.name ?? '')
export class GamanzaConsumer {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly bonusProducerEventHandler: ProducerEventHandler,
  ) {}

  // Currently only process flat bonus
  @Process(JOB.GAMANZA_REWARD_BONUS)
  async processRewardBonus(job: Job<GamanzaRewardBonusJobData>): Promise<any> {
    const bonus = await this.prismaService.bonus.findUnique({
      where: {
        id: job.data.bonusId,
      },
      select: {
        id: true,
        rewardType: true,
        rewardAmount: true,
      },
    });

    if (!bonus || bonus?.rewardType !== BonusRewardTypes.FLAT) return;

    this.bonusProducerEventHandler.handleEvent({
      event: {
        amount: bonus.rewardAmount,
        bonusId: bonus.id,
        userId: job.data.userId,
      },
      type: BonusTriggerConfigTypes.ADMIN_MANUAL,
      userId: job.data.userId,
    });
  }
}
