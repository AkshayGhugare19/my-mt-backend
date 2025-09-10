import { Prisma } from '@prisma/client';

export const rewardSentSelector = Prisma.validator<Prisma.RewardDefaultArgs>()({
  select: {
    id: true,
    amount: true,
    type: true,
    bonusProgressId: true,
    description: true,
    createdAt: true,
    updatedAt: true,
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

export type RewardSent = Prisma.RewardGetPayload<typeof rewardSentSelector>;

export const rewardReceivedSelector =
  Prisma.validator<Prisma.RewardDefaultArgs>()({
    select: {
      ...rewardSentSelector.select,
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
      createdAt: true,
      updatedAt: true,
      user: false,
      sender: rewardSentSelector.select.user,
    },
  });

export type RewardReceived = Prisma.RewardGetPayload<
  typeof rewardReceivedSelector
>;

export const rewardAdminSelector = Prisma.validator<Prisma.RewardDefaultArgs>()(
  {
    select: {
      ...rewardReceivedSelector.select,
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
  },
);

export type RewardAdmin = Prisma.RewardGetPayload<typeof rewardAdminSelector>;
