import { Prisma } from '@prisma/client';

const couponCodeReportSelect = Prisma.validator<Prisma.CouponCodeDefaultArgs>()(
  {
    select: {
      id: true,
      code: true,
      type: true,
      stock: true,
      config: true,
      expiresAt: true,
      disabledAt: true,
      createdAt: true,
      createdBy: {
        select: {
          nickname: true,
        },
      },
    },
  },
);

export type CouponCodeReport = Prisma.CouponCodeGetPayload<
  typeof couponCodeReportSelect
> & {
  totalStock: number;
  groups: {
    id: number;
    name: string;
  }[]
};

export const couponCodeRedeemReportSelect =
  Prisma.validator<Prisma.CouponCodeRedeemDefaultArgs>()({
    select: {
      createdAt: true,
      consumed: true,
      couponCode: {
        select: {
          id: true,
          config: true,
          code: true,
        },
      },
      redeemer: {
        select: {
          id: true,
          nickname: true,
          wallet: true,
        },
      },
      bonusProgress: {
        select: {
          currentProgress: true,
          targetProgress: true,
        },
      },
    },
  });

export type CouponCodeRedeemReport = Prisma.CouponCodeRedeemGetPayload<
  typeof couponCodeRedeemReportSelect
>;

export const userCouponCodeRedeemsSelect =
  Prisma.validator<Prisma.CouponCodeRedeemDefaultArgs>()({
    select: {
      id: true,
      createdAt: true,
      consumed: true,
      couponCode: {
        select: {
          config: true,
          type: true,
          code: true,
        },
      },
      bonusProgress: {
        select: {
          rewardAmount: true,
          targetProgress: true,
          configOverride: true,
        },
      },
    },
  });

export type UserCouponCodeRedeems = Prisma.CouponCodeRedeemGetPayload<
  typeof userCouponCodeRedeemsSelect
>;

export const couponGroupReportSelect =
  Prisma.validator<Prisma.CouponGroupDefaultArgs>()({
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      coupons: {
        select: {
          couponCode: true,
        },
      },
    },
  });

export type CouponGroupReport = Prisma.CouponGroupGetPayload<
  typeof couponGroupReportSelect
>;
