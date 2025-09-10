import { ErrorMessages } from '@common/enums/error-messages.enum';
import { PagePaginationRequest, PagePaginationResponse } from '@common/types';
import { PrismaService, PrismaTransactionManager } from '@infrastructure/database/prisma/prisma.service';
import { AddBonusTriggerConsumerConfig } from '@modules/bonus/dtos/add-bonus-trigger-consumer-config';
import { AddBonusTriggerProducerConfig } from '@modules/bonus/dtos/add-bonus-trigger-producer-config';
import { AddBonusTriggerProgressConfig } from '@modules/bonus/dtos/add-bonus-trigger-progress.dto';
import {
  BonusTriggerConfigType,
  BonusTriggerTarget,
  BonusTriggerTargets,
  BonusTriggerType,
  BonusTriggerTypes,
} from '@modules/bonus/enum';
import {
  BonusTriggerOptions,
  BonusTriggerValidators,
} from '@modules/bonus/schema/trigger';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BonusTrigger,
  BonusTriggerConsumerConfig,
  BonusTriggerProducerConfig,
} from '@prisma/client';
import { ZodType } from 'zod';

@Injectable()
export class BonusTriggerService {
  constructor(private readonly prismaService: PrismaService) {}

  async getAllTriggers(
    pagination: PagePaginationRequest = {},
    withDeleted: boolean = false,
  ): Promise<PagePaginationResponse<BonusTrigger>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const count = await this.prismaService.bonusTrigger.count({
      where: {
        deletedAt: withDeleted ? undefined : null,
      },
    });
    const data = await this.prismaService.bonusTrigger.findMany({
      where: {
        deletedAt: withDeleted ? undefined : null,
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      limit,
      page,
      total: count,
    };
  }

  async findTriggersByIds(ids: number[]): Promise<BonusTrigger[]> {
    return this.prismaService.bonusTrigger.findMany({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
      },
    });
  }

  async findConsumerTriggersByBonusIds(
    ids: string[],
    transactionManager?: PrismaTransactionManager,
  ): Promise<BonusTriggerConsumerConfig[]> {
    return this.getClient(
      transactionManager,
    ).bonusTriggerConsumerConfig.findMany({
      where: {
        bonusId: {
          in: ids,
        },
        bonus: {
          deletedAt: null,
        },
      },
    });
  }

  async findProducerTriggersByBonusIds(
    ids: string[],
    withDeleted: boolean = false,
  ): Promise<BonusTriggerProducerConfig[]> {
    return this.prismaService.bonusTriggerProducerConfig.findMany({
      where: {
        bonusId: {
          in: ids,
        },
        bonus: withDeleted
          ? undefined
          : {
              deletedAt: null,
            },
      },
    });
  }

  async validateProducerTriggers(
    createProducerTriggers: AddBonusTriggerProducerConfig[],
  ): Promise<void> {
    const ids = createProducerTriggers.map((trigger) => trigger.triggerId);
    const triggers = await this.findTriggersByIds(ids);
    // Check if all triggers exist and are of type producer
    const missingTriggers = ids.find((id) => {
      const trigger = triggers.find((t) => t.id === id);
      if (!trigger) {
        return true;
      }
      return trigger.type !== BonusTriggerTypes.PRODUCER;
    });
    if (missingTriggers) {
      throw new BadRequestException(
        {
          errors: {
            producerTriggers: missingTriggers,
          },
        },
        { cause: ErrorMessages.INVALID_PRODUCER_TRIGGER },
      );
    }

    createProducerTriggers.forEach((trigger) => {
      this.verifyTriggerConfigByType(trigger, BonusTriggerTypes.PRODUCER);
    });
  }

  async validateProgressTriggers(
    createProgressTriggers: AddBonusTriggerProgressConfig[],
  ): Promise<void> {
    const ids = createProgressTriggers.map((trigger) => trigger.triggerId);
    const triggers = await this.findTriggersByIds(ids);
    // Check if all triggers exist and are of type producer
    const missingTriggers = ids.find((id) => {
      const trigger = triggers.find((t) => t.id === id);
      if (!trigger) {
        return true;
      }
      return trigger.type !== BonusTriggerTypes.PROGRESS;
    });
    if (missingTriggers) {
      throw new BadRequestException(
        {
          errors: {
            producerTriggers: missingTriggers,
          },
        },
        { cause: ErrorMessages.INVALID_PROGRESS_TRIGGER },
      );
    }

    const configOptionsMap = this.reduceTriggersConfigOptions(triggers);

    createProgressTriggers.forEach((trigger) => {
      this.verifyTriggerConfigByType(trigger, BonusTriggerTypes.PROGRESS);
      this.verifyTargetConfig(
        trigger.target || BonusTriggerTargets.GLOBAL,
        trigger.config,
        configOptionsMap.get(trigger.triggerId)!,
      );
    });
  }

  async validateConsumerTriggers(
    createConsumerTriggers: AddBonusTriggerConsumerConfig[],
  ): Promise<void> {
    const ids = createConsumerTriggers.map((trigger) => trigger.triggerId);
    const triggers = await this.findTriggersByIds(ids);
    // Check if all triggers exist and are of type producer
    const missingTriggers = ids.find((id) => {
      const trigger = triggers.find((t) => t.id === id);
      if (!trigger) {
        return true;
      }
      return trigger.type !== BonusTriggerTypes.CONSUMER;
    });
    if (missingTriggers) {
      throw new BadRequestException(
        {
          errors: {
            consumerTriggers: missingTriggers,
          },
        },
        { cause: ErrorMessages.INVALID_CONSUMER_TRIGGER },
      );
    }

    const configOptionsMap = this.reduceTriggersConfigOptions(triggers);

    createConsumerTriggers.forEach((trigger) => {
      this.verifyTriggerConfigByType(trigger, BonusTriggerTypes.CONSUMER);
      this.verifyTargetConfig(
        trigger.target || BonusTriggerTargets.GLOBAL,
        trigger.config,
        configOptionsMap.get(trigger.triggerId)!,
      );
    });
  }

  private reduceTriggersConfigOptions(
    triggers: BonusTrigger[],
  ): Map<number, Map<BonusTriggerTarget, BonusTriggerOptions['config']>> {
    return triggers.reduce((acc, trigger) => {
      acc.set(
        trigger.id,
        (trigger.configOptions as BonusTriggerOptions[]).reduce(
          (acc, config) => {
            if (config.targetValue.length === 0) {
              acc.set(BonusTriggerTargets.GLOBAL, config.config);
            } else {
              for (const target of config.targetValue) {
                acc.set(target, config.config);
              }
            }

            return acc;
          },
          new Map<BonusTriggerTarget, BonusTriggerOptions['config']>(),
        ),
      );
      return acc;
    }, new Map<number, Map<BonusTriggerTarget, BonusTriggerOptions['config']>>());
  }

  private verifyTriggerConfigByType(
    trigger:
      | AddBonusTriggerProducerConfig
      | AddBonusTriggerProgressConfig
      | AddBonusTriggerConsumerConfig,
    triggerType: BonusTriggerType,
  ): void {
    const validator = ((type: BonusTriggerConfigType): ZodType => {
      switch (triggerType) {
        case BonusTriggerTypes.PRODUCER:
          return BonusTriggerValidators.getProducer(type);
        case BonusTriggerTypes.PROGRESS:
          return BonusTriggerValidators.getProgress(type);
        case BonusTriggerTypes.CONSUMER:
          return BonusTriggerValidators.getConsumer(type);
        default:
          throw new Error(`Invalid trigger type: ${triggerType}`);
      }
    })(trigger.type);

    if (!validator) {
      throw new BadRequestException(
        {
          errors: {
            producerTriggers: trigger.triggerId,
          },
        },
        { cause: ErrorMessages.INCOMPATIBLE_TRIGGER_TYPE_AND_TRIGGER_CONFIG },
      );
    }

    const parsed = validator.safeParse(trigger);
    if (!parsed.success) {
      throw new BadRequestException(
        {
          errors: {
            producerTriggers: trigger.triggerId,
          },
        },
        { cause: ErrorMessages.INCOMPATIBLE_TRIGGER_TYPE_AND_TRIGGER_CONFIG },
      );
    }
  }

  private verifyTargetConfig<T extends Record<string, unknown>>(
    target: BonusTriggerTarget,
    config: T,
    triggerConfigOptions: Map<
      BonusTriggerTarget,
      BonusTriggerOptions['config']
    >,
  ): void {
    const options = triggerConfigOptions.get(target);

    if (!options) {
      return;
    }

    // Remove any extra config options
    Object.entries(config).forEach(
      ([key, value]: [BonusTriggerTarget, boolean]) => {
        if (
          !options[key as keyof typeof options] ||
          (options[key as keyof typeof options] && !value)
        ) {
          delete config[key];
        }
      },
    );
  }

  private getClient(transactionManager?: PrismaTransactionManager): PrismaTransactionManager {
    return transactionManager ?? this.prismaService;
  }
}
