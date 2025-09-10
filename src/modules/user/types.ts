import { BalanceInfo } from '@modules/balance/types';
import {
  User,
  Role as PrismaRole,
  Prisma,
  UserPreference,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type UserWithBalance = Omit<
  User,
  | 'password'
  | 'deletedAt'
  | 'blockedAt'
  | 'maxExposurePerVip'
  | 'maxNumberOfUsers'
  | 'updatedAt'
  | 'predefinedBookieStake'
  | 'flexibleBookieStake'
  | 'userBookieStake'
> & {
  roles: PrismaRole[];
  hasPassword?: boolean;
  balance: BalanceInfo;
  nonPlayableBalance?: Decimal;
  favoriteGames: {
    id: string;
    name: string;
  }[];
  favoriteCategory: string;
  master: {
    nickname: string | null;
  } | null;
  totalRake: number;
  preference?: UserPreference;
  provider? : string  | null,
  socialProviderId? : string |null
};

export type UserInfo = {
  createdAt: Date;
  id: string;
  email: string | null;
  nickname: string | null;
  roles: PrismaRole[];
  enable2FA: boolean;
  wallet: string | null;
  resetPasswordRequired: boolean;
  playerTag: string;
  masterId: string | null;
  partnerMatrixBtag: string | null;
  level: number;
  rank: string;
};

export type CreateCredentialsUser = {
  email: string;
  password: string;
  promoCode?: string;
  partnerMatrixBtag?: string;
  countryCode?: string;
};

export type CreateVipUser = {
  email?: string;
  nickname?: string;
  maxBetSize: Decimal | null;
  password: string;
  userBookieStake?: number;
  partnerMatrixBtag?: string;
  isBonusEnabled: boolean;
};

export type CreateWalletUser = {
  wallet: string;
  blockchain: number;
  partnerMatrixBtag?: string;
  countryCode?: string;
};

export type CreateUser = {
  email?: string;
  password?: string;
  roleIds: number[];
  wallet?: string;
  blockchain?: number;
  resetPasswordRequired?: boolean;
  countryCode?: string;
  masterId?: string;
  needsActivation?: boolean;
  playerTag: string;
} & Partial<
  Pick<
    User,
    | 'maxNumberOfUsers'
    | 'masterId'
    | 'maxBetSize'
    | 'nickname'
    | 'canWithdraw'
    | 'maxExposurePerVip'
    | 'predefinedBookieStake'
    | 'flexibleBookieStake'
    | 'userBookieStake'
    | 'partnerMatrixBtag'
    | 'isBonusEnabled'
  >
>;

export type MasterUserDetails = {
  createdAt: Date;
  id: string;
  email: string | null;
  enable2FA: boolean;
  masterId: string | null;
  nickname: string | null;
  wallet: string | null;
  roles: PrismaRole[];
  maxExposurePerVip: Decimal | null;
  balance: Decimal;
  debt: Decimal;
  maxNumberOfUsers: number | null;
  totalIssuedTo: Decimal;
  totalSettled: Decimal;
  predefinedBookieStake: Decimal | null;
  flexibleBookieStake: Decimal | null;
  resetPasswordRequired: boolean;
  _count: {
    users: number;
  };
  blockedAt: Date | null;
};

export const userWithStatisticsSchema =
  Prisma.validator<Prisma.UserDefaultArgs>()({
    select: {
      createdAt: true,
      id: true,
      email: true,
      userRoles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      wallet: true,
      masterId: true,
      master: {
        select: {
          nickname: true,
        },
      },
      nickname: true,
      avatar: true,
      canWithdraw: true,
      resetPasswordRequired: true,
      userBookieStake: true,
      partnerMatrixBtag: true,
      maxBetSize: true,
      playerTag: true,
      blockedAt: true,
      isBonusEnabled: true,
      rank: true,
      balance: {
        select: {
          balance: true,
          debt: true,
          biggestLoss: true,
          biggestWin: true,
          totalDeposit: true,
          totalIssuedTo: true,
          totalSettled: true,
          totalLoss: true,
          totalWin: true,
          totalWithdraw: true,
          volumePlayed: true,
          userId: true,
        },
      },
      Web3AuthAccount: {
        select: {
          email: true,
        },
      },
    },
  });
