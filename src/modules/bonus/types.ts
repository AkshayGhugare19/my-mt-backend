import { PrismaTransactionManager } from '@infrastructure/database/prisma/prisma.service';
import {
  BonusProgressStatus,
  BonusTriggerConfigType,
} from '@modules/bonus/enum';
import { BonusTriggerConfig } from '@modules/bonus/schema/trigger';
import { Prisma, UserBonusBalance } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export const bonusWithProducerTriggersSelector =
  Prisma.validator<Prisma.BonusDefaultArgs>()({
    include: {
      bonusTriggerProducerConfig: true,
    },
  });

export type BonusWithProducerTriggers = Prisma.BonusGetPayload<
  typeof bonusWithProducerTriggersSelector
>;

export const bonusWithTriggersSelector =
  Prisma.validator<Prisma.BonusDefaultArgs>()({
    include: {
      bonusTriggerProducerConfig: {
        include: {
          trigger: true,
        },
      },
      bonusTriggerProgressConfig: {
        include: {
          trigger: true,
        },
      },
      bonusTriggerConsumerConfig: {
        include: {
          trigger: true,
        },
      },
    },
  });

export type BonusWithTriggers = Prisma.BonusGetPayload<
  typeof bonusWithTriggersSelector
>;

export const bonusProgressionWithBonus =
  Prisma.validator<Prisma.UserBonusProgressionDefaultArgs>()({
    include: {
      bonus: {
        ...bonusWithTriggersSelector,
      },
    },
  });

export type UserBonusProgressionWithBonus =
  Prisma.UserBonusProgressionGetPayload<typeof bonusProgressionWithBonus>;

export type UserBonusProgressionWithBonusAndCodes =
  Prisma.UserBonusProgressionGetPayload<
    typeof bonusProgressionWithBonus
  > & {
    couponCodeRedeem?: {
      couponCode: {
        code: string;
      };
    };
    bonusBalance?: {
      balance: number;
    };
  };

export const bonusProgressionWithBonusProgressTriggers =
  Prisma.validator<Prisma.UserBonusProgressionDefaultArgs>()({
    include: {
      bonus: {
        include: {
          bonusTriggerProgressConfig: true,
        },
      },
    },
  });

export type BonusProgressionWithBonusProgressTriggers =
  Prisma.UserBonusProgressionGetPayload<
    typeof bonusProgressionWithBonusProgressTriggers
  >;

export const bonusBalanceWithBonus =
  Prisma.validator<Prisma.UserBonusBalanceDefaultArgs>()({
    include: {
      bonus: {
        ...bonusWithTriggersSelector,
      },
    },
  });

export type UserBonusBalanceWithBonus = Prisma.UserBonusBalanceGetPayload<
  typeof bonusBalanceWithBonus
>;

export const BonusBalanceWithBonusConfig =
  Prisma.validator<Prisma.UserBonusBalanceDefaultArgs>()({
    include: {
      bonus: {
        include: {
          bonusTriggerConsumerConfig: true,
        },
      },
    },
  });

export type UserBonusBalanceWithBonusConfig = Prisma.UserBonusBalanceGetPayload<
  typeof BonusBalanceWithBonusConfig
>;

export type CreateUserBonusProgression = Pick<
  Prisma.UserBonusProgressionCreateManyInput,
  | 'id'
  | 'bonusId'
  | 'currentProgress'
  | 'bonusBalanceId'
  | 'rewardAmount'
  | 'userId'
  | 'targetProgress'
  | 'status'
  | 'expiresAt'
  | 'claimedAt'
  | 'configOverride'
  | 'isRefillable'
>;

export type CreateUserBonusProgressionWithCallbacks = {
  createUserBonusProgression: CreateUserBonusProgression;
  callbacks?: ((
    transactionManager: PrismaTransactionManager,
  ) => Promise<void>)[];
};

export type UpdateBonusProgression = {
  id: string;
  status: BonusProgressStatus;
  progress: number;
  claimedAt?: Date | null;
};

export type CreateUserBonusBalance = Pick<
  Prisma.UserBonusBalanceCreateManyInput,
  'userId' | 'balance' | 'bonusId' | 'expiresAt'
>;

export type CreateUserBonusBalanceWithCallbacks = {
  createUserBonusBalance: CreateUserBonusBalance;
  callbacks?: ((
    transactionManager: PrismaTransactionManager,
  ) => Promise<void>)[];
};

export type RolloverPercentageValidationConfig = Pick<
  BonusTriggerConfig,
  'rolloverPercentage'
>;

export type AdminEventData = {
  amount: number;
  bonusId: string;
  userId: string;
};

export type BetSettleEventData = {
  userId: string;
};

export type BonusEventPayload<T = Record<string, any>> = {
  type: BonusTriggerConfigType;
  userId: string;
  event: T;
};

export type BonusProgressEvent<T = Record<string, any>> = {
  bonusProgression: BonusProgressionWithBonusProgressTriggers;
  event: T;
};

export type BonusProducerEvent<T = Record<string, any>> = {
  bonus: BonusWithProducerTriggers;
  event: T;
};

export type BonusLogStorage = {
  logs: any[];
};

export type BonusAsyncLocalStorage = AsyncLocalStorage<BonusLogStorage>;

export type BonusBalanceWithBonusType = UserBonusBalance & {
  type: BonusTriggerConfigType;
};
