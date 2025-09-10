import { PrismaTransactionManager } from '@infrastructure/database/prisma/prisma.service';
import {
  BonusProducerEvent,
  BonusProgressEvent,
  BonusWithProducerTriggers,
  CreateUserBonusBalance,
  CreateUserBonusBalanceWithCallbacks,
  CreateUserBonusProgression,
  CreateUserBonusProgressionWithCallbacks,
  UpdateBonusProgression,
} from '@modules/bonus/types';

export interface ProducerStrategy {
  createProgressEntity(
    targetEvent: BonusProducerEvent,
  ): Promise<
    CreateUserBonusProgression | CreateUserBonusProgressionWithCallbacks | null
  >;
  createBonusBalanceEntity(
    targetEvent: BonusProducerEvent,
  ): Promise<
    CreateUserBonusBalance | CreateUserBonusBalanceWithCallbacks | null
  >;
  getProducerContext(
    targetEvent: Omit<BonusProducerEvent, 'triggerConfig'>,
  ): Promise<{
    bonus: BonusWithProducerTriggers;
    callbacks: ((
      transactionManager: PrismaTransactionManager,
    ) => Promise<void>)[];
  } | null>;
}

export interface ProgressStrategy {
  calculateProgress(
    targetEvent: BonusProgressEvent,
  ): Promise<UpdateBonusProgression | null>;

  createBonusBalanceEntity(
    targetEvent: BonusProgressEvent,
  ): Promise<CreateUserBonusBalance | null>;
}
