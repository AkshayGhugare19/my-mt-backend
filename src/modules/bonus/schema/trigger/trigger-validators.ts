import { BonusTriggerConfigType } from '@modules/bonus/enum';
import {
  BonusTriggerConfigAdminManualProducerSchema,
  BonusTriggerConfigBetSettlementProgressSchema,
  BonusTriggerConfigCashbackProducerSchema,
  BonusTriggerConfigDepositProducerSchema,
} from '@modules/bonus/schema/trigger/validators';
import { BonusTriggerConfigBetPlacingConsumerSchema } from '@modules/bonus/schema/trigger/validators/consumer/bet-placing-consumer.schema';
import { ZodLiteral, ZodObject } from 'zod';
import { BonusTriggerConfigRakebackProducerSchema } from './validators/producer/rakeback-producer.schema';

export abstract class BonusTriggerValidators {
  static producers = {
    deposit: BonusTriggerConfigDepositProducerSchema,
    adminManual: BonusTriggerConfigAdminManualProducerSchema,
    cashback: BonusTriggerConfigCashbackProducerSchema,
    rakeback: BonusTriggerConfigRakebackProducerSchema,
  };

  static progress = {
    betSettlement: BonusTriggerConfigBetSettlementProgressSchema,
  };

  static consumer = {
    betPlacing: BonusTriggerConfigBetPlacingConsumerSchema,
  };

  static getAllProducers(): ZodObject<{
    type: ZodLiteral<BonusTriggerConfigType>;
  }>[] {
    return Object.values(BonusTriggerValidators.producers);
  }

  static getProducer<T extends keyof typeof BonusTriggerValidators.producers>(
    type: BonusTriggerConfigType,
  ): (typeof BonusTriggerValidators.producers)[T] {
    const stakeCaseType = type.replace(/(_\w)/g, (match) =>
      match[1].toUpperCase(),
    );
    const schema = BonusTriggerValidators.producers[stakeCaseType as T];

    if (!schema) {
      throw new Error(`No schema found for Trigger config type ${type}`);
    }

    return schema;
  }

  static getProgress<T extends keyof typeof BonusTriggerValidators.progress>(
    type: BonusTriggerConfigType,
  ): (typeof BonusTriggerValidators.progress)[T] {
    const stakeCaseType = type.replace(/(_\w)/g, (match) =>
      match[1].toUpperCase(),
    );
    const schema = BonusTriggerValidators.progress[stakeCaseType as T];

    if (!schema) {
      throw new Error(`No schema found for Trigger config type ${type}`);
    }

    return schema;
  }

  static getConsumer<T extends keyof typeof BonusTriggerValidators.consumer>(
    type: BonusTriggerConfigType,
  ): (typeof BonusTriggerValidators.consumer)[T] {
    const stakeCaseType = type.replace(/(_\w)/g, (match) =>
      match[1].toUpperCase(),
    );
    const schema = BonusTriggerValidators.consumer[stakeCaseType as T];

    if (!schema) {
      throw new Error(`No schema found for Trigger config type ${type}`);
    }

    return schema;
  }
}
