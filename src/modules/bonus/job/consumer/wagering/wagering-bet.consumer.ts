import { OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { AsyncLogService } from '@modules/bonus/service/async-log.service';
import { BetSettledEvent } from '@modules/bet/event/bet-settled.event';
import { JOB } from '@infrastructure/queue/bull/constants/job';
import { BetStatuses } from '@modules/bet/enum/bet-status.enum';
import { BetBonusMetadata } from '@modules/bet/types';
import { BonusProgressStatuses } from '@modules/bonus/enum';
import { WageringProgressProducer } from '@modules/bonus/job/producer/wagering/progress.producer';
import { bonusProgressionWithBonus } from '@modules/bonus/types';
import { BonusProgressionService } from '@modules/bonus/service/bonus-progression.service';

@Processor(QueuesDefinition.WAGERING_BET_QUEUE)
export class WageringBetConsumer {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly wageringProgressProducer: WageringProgressProducer,
    private readonly bonusProgressionService: BonusProgressionService,
    private readonly logService: AsyncLogService,
  ) {}

  @OnQueueFailed()
  async onQueueFailed(job: Job<BetSettledEvent>, error: Error): Promise<void> {
    await this.logService.init(async () => {
      this.logService.log({ job: job.data, error: error.message, stack: error.stack }, 'TipConsumer.onQueueFailed');
    });
  }

  @Process({ name: JOB.BONUS_WAGERING_BET_SETTLED, concurrency: 5 })
  async processBetSettled(job: Job<BetSettledEvent>): Promise<void> {
    // eslint-disable-next-line sonarjs/cognitive-complexity
    await this.logService.init(async () => {
      const { betId, status, userId, roundFinished } = job.data;
      this.logService.log({ betId, status }, 'TipConsumer.processBetSettled');

      // Only win or loss bets are supported
      // Is round is not finished, we don't process the bet. There will be a round finished event later
      if (status !== BetStatuses.WIN && status !== BetStatuses.LOSS && status !== BetStatuses.CASH_OUT) {
        this.logService.log(
          { betId, status, roundFinished, message: 'Bet is not settled' },
          'TipConsumer.processBetSettled.bet-not-settled',
        );

        return null;
      }

      const bet = await this.prismaService.bet.findUnique({
        where: { id: betId },
      });

      if (!bet) {
        this.logService.log({ betId, message: 'Bet not found' }, 'TipConsumer.processBetSettled.bet-not-found');
        return null;
      }

      const metadata = bet.metadata as unknown as BetBonusMetadata;

      // Check if the bet has any bonus used
      if (metadata.bonusUsed && metadata.bonusUsed.length > 1) {
        const bonusTypes = new Set<string>();
        for (const bonusUsed of metadata.bonusUsed) {
          bonusTypes.add(JSON.stringify(bonusUsed.bonusTypes));
        }
        if (bonusTypes.size > 1) {
          this.logService.log(
            { betId, message: 'Bet has multiple bonuses used' },
            'TipConsumer.processBetSettled.bet-multiple-bonuses-used',
          );
          // If the bet has multiple bonuses used, With different types, process only the bet completion event
          // There bonus progression will not be processed when we have multiple bonuses used
          await this.wageringProgressProducer.addProcessWagerBetCompleted({
            wageringProgressIds: metadata.bonusUsed.map((bonus) => bonus.wageringBonusId),
          });
          return;
        }
      }

      const specificBonusUsed = metadata.bonusUsed?.at(0)?.bonusTypes;

      // Get the other wagering bonuses used
      const specificBonusId = metadata.bonusUsed?.at(0)?.wageringBonusId;

      const userActiveWageringBonus = await this.prismaService.userBonusProgression.findFirst({
        where: {
          status: BonusProgressStatuses.PENDING,
          deletedAt: null,
          userId,
          OR:
            specificBonusId && specificBonusUsed
              ? [
                  {
                    id: specificBonusId,
                  },
                  {
                    bonus: {
                      bonusTriggerProducerConfig: {
                        every: {
                          type: {
                            in: specificBonusUsed,
                          },
                        },
                      },
                    },
                  },
                ]
              : undefined,
        },
        orderBy: {
          createdAt: 'asc',
        },
        include: bonusProgressionWithBonus.include,
      });

      const wageringBonusesUsed = metadata.bonusUsed?.filter(
        (bonus) => bonus.wageringBonusId !== undefined && bonus.wageringBonusId !== null,
      );

      // If the bet has multiple bonuses used, With the same type, we process the bet progression for the active progression
      // For all other bonuses, we process the bet completion event
      if (wageringBonusesUsed) {
        await this.wageringProgressProducer.addProcessWagerBetCompleted({
          wageringProgressIds: wageringBonusesUsed.map((bonus) => bonus.wageringBonusId),
        });
      }

      if (!userActiveWageringBonus) {
        this.logService.log(
          { betId, userId, message: 'User has no active wagering bonus' },
          'WageringBetConsumer.processBetSettled.user-no-active-wagering-bonus',
        );
        return;
      }

      const wageringBonusProgressConfigs = this.bonusProgressionService.findWageringBonusProgressConfigs(
        betId,
        userActiveWageringBonus,
      );

      if (!wageringBonusProgressConfigs) {
        this.logService.log(
          { betId, message: 'Wagering bonus progress configs not found' },
          'WageringBetConsumer.processBetSettled.wagering-bonus-progress-configs-not-found',
        );
        return;
      }

      const { progressConfig } = wageringBonusProgressConfigs;
      const newRolloverProgress = this.bonusProgressionService.computeProgress(bet, progressConfig);

      await this.wageringProgressProducer.addProcessWagerProgress({
        bet,
        wageringBonusId: userActiveWageringBonus.id,
        wageringProgress: newRolloverProgress,
        targetBonusTypes: specificBonusUsed,
        excludeBonusIds: [],
      });
    });
  }
}
