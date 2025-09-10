import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export const tipSentSelector = Prisma.validator<Prisma.RewardDefaultArgs>()({
  select: {
    id: true,
    amount: true,
    createdAt: true,
    updatedAt: true,
    user: {
      select: {
        id: true,
        playerTag: true,
      },
    },
  },
});

export type TipSent = Prisma.RewardGetPayload<typeof tipSentSelector>;
export type CreateTip = {
  senderId: string;
  amount: Decimal;
  targetUsername: string;
};

export const tipReceivedSelector =
  Prisma.validator<Prisma.RewardDefaultArgs>()({
    select: {
      ...tipSentSelector.select,
      bonusProgress: {
        select: {
          status: true,
          currentProgress: true,
          targetProgress: true,
          bonusBalance: {
            select: {
              balance: true,
            },
          },
        },
      },
      type: true,
      createdAt: true,
      updatedAt: true,
      user: false,
      sender: tipSentSelector.select.user,
    },
  });

export type TipReceived = Prisma.RewardGetPayload<typeof tipReceivedSelector>;

export const tipAdminSelector = Prisma.validator<Prisma.RewardDefaultArgs>()({
  select: {
    ...tipReceivedSelector.select,
    sender: {
      select: {
        id: true,
        playerTag: true,
        nickname: true,
        email: true,
        Web3AuthAccount: {
          select: {
            email: true,
          },
        },
      },
    },
    user: {
      select: {
        id: true,
        playerTag: true,
        nickname: true,
        email: true,
        Web3AuthAccount: {
          select: {
            email: true,
          },
        },
      },
    },
  },
});

export type TipAdmin = Prisma.RewardGetPayload<typeof tipAdminSelector>;

export const tipWithBonusBalanceSelector =
  Prisma.validator<Prisma.RewardDefaultArgs>()({
    include: {
      bonusProgress: {
        include: {
          bonusBalance: true,
        },
      },
    },
  });

export type TipWithBonusBalance = Prisma.RewardGetPayload<
  typeof tipWithBonusBalanceSelector
>;
